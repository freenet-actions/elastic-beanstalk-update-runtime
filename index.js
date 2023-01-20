const core = require('@actions/core');
const {ElasticBeanstalkClient, DescribeEnvironmentsCommand, ListAvailableSolutionStacksCommand, UpdateEnvironmentCommand, waitUntilEnvironmentUpdated} = require('@aws-sdk/client-elastic-beanstalk');

async function getCurrentSolutionStackName(client, applicationName, environmentName) {
  const command = new DescribeEnvironmentsCommand({
    ApplicationName: applicationName,
    EnvironmentNames: [environmentName],
    IncludeDeleted: false
  });
  const response = await client.send(command);
  if (response.Environments.length === 0) {
    core.setFailed(`No environment "${environmentName}" in application "${applicationName}" found.`);
    process.exit(1);
  } else if (response.Environments.length !== 1) {
    core.setFailed(`Found ${response.Environments.length} environments with name "${environmentName}" in application "${applicationName}".`);
    process.exit(2);
  } else {
    const currentSolutionStack = response.Environments[0].SolutionStackName;
    if (currentSolutionStack === undefined) {
      core.setFailed(`Environment "${environmentName}" in application "${applicationName}" does not have a solution stack name.`);
      process.exit(3);
    } else {
      return currentSolutionStack;
    }
  }
}

function compareSolutionStackName(actual, expected, useRegex) {
  if (useRegex) {
    return actual.match(expected) !== null;
  } else {
    return expected === actual;
  }
}

async function fetchLatestAvailableSolutionStack(client, expected) {
  const regex = new RegExp(expected);
  const command = new ListAvailableSolutionStacksCommand({});
  const response = await client.send(command);
  for(const solution of response.SolutionStacks) {
    if (regex.test(solution)) {
      return solution;
    }
  }

  core.info('The following solution stacks were found:');
  for(const solution of response.SolutionStacks) {
    core.info(`- ${solution}`);
  }
  core.setFailed(`No solution stack with a name matching "${expected}" found.`);
  process.exit(4);
}

async function triggerPlatformUpdate(client, applicationName, environmentName, solutionStackName) {
  const command = new UpdateEnvironmentCommand({
    ApplicationName: applicationName,
    EnvironmentName: environmentName,
    SolutionStackName: solutionStackName
  });

  await client.send(command);
}

async function waitForEnvironmentUpdated(client, applicationName, environmentName, waitTime) {
  const commandInput = {
    ApplicationName: applicationName,
    EnvironmentNames: [environmentName],
    IncludeDeleted: false
  };

  // Add maxDelay to waitTime, because waiter exists when elapsed + delay > waitTime
  await waitUntilEnvironmentUpdated({client: client, maxWaitTime: waitTime + 30, maxDelay: 30}, commandInput);
}

(async () => {
  try {
    const awsAccessKey = core.getInput('aws_access_key', {required: true});
    const awsSecretKey = core.getInput('aws_secret_key', {required: true});
    const applicationName = core.getInput('application_name', {required: true});
    const environmentName = core.getInput('environment_name', {required: true});
    const region = core.getInput('region', {required: true});
    const expected = core.getInput('expected', {required: true});
    const matchRegex = core.getBooleanInput('match_regex');
    const waitTime = core.getInput('wait_time') || 300;

    const client = new ElasticBeanstalkClient({
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
      region: region
    });

    const currentSolutionStackName = await getCurrentSolutionStackName(client, applicationName, environmentName);
    core.info(`Environment "${environmentName}" in application "${applicationName}" is currently running solution stack "${currentSolutionStackName}".`);
    if (compareSolutionStackName(currentSolutionStackName, expected, matchRegex)) {
      core.info('Solution stack name matches expectation, no update required.');
      process.exit(0);
    }

    const target = matchRegex ? await fetchLatestAvailableSolutionStack(client, expected) : expected;
    core.info(`Updating environment "${environmentName}" in application "${applicationName}" to solution stack "${target}".`);
    await triggerPlatformUpdate(client, applicationName, environmentName, target);
    core.info(`Update triggered, waiting up to ${waitTime} seconds for update to finish.`);
    await waitForEnvironmentUpdated(client, applicationName, environmentName, waitTime);
    core.info('Update complete');

    process.exit(0);
  } catch(error) {
    core.setFailed(error.message);
  }
})();

# elastic-beanstalk-update-runtime

This action updates the solution stack used by an AWS Elastic Beanstalk environment.

## Usage

### Exact matching

You can specify an exact solution stack name to match against:

```yaml
- uses: freenet-actions/elastic-beanstalk-update-runtime@HEAD
  with:
    aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    application_name: MyApplicationName
    environment_name: MyApplication-Environment
    region: eu-central-1
    expected: 64bit Amazon Linux 2 v3.5.3 running PHP 8.1
```

The action will trigger an update when the solution stack of the environment does
not match the expectation exactly.

### Regex matching

You can also enable regex matching:

```yaml
- uses: freenet-actions/elastic-beanstalk-update-runtime@HEAD
  with:
    aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    application_name: MyApplicationName
    environment_name: MyApplication-Environment
    region: eu-central-1
    expected: 64bit Amazon Linux 2 v.* running PHP 8.1
    match_regex: true
```

The action will then trigger an update when the solution stack of the environment does
not match the `expectated` regex. The new solution stack will be the latest solution stack
that matches the `expected` regex.

## Inputs

| Input              | Required | Default | Description                                                       |
|--------------------|----------|---------|-------------------------------------------------------------------|
| `aws_access_key`   | yes      |         | AWS credentials                                                   |
| `aws_secret_key`   | yes      |         | AWS credentials                                                   |
| `application_name` | yes      |         | The application to update                                         |
| `environment_name` | yes      |         | The environment to update                                         |
| `region`           | yes      |         | The region in which the application is running                    |
| `expected`         | yes      |         | The expected solution stack name                                  |
| `match_regex`      | no       | false   | Set to true to enable regex matching.                             |
| `wait_time`        | no       | 300     | The time in seconds to wait for the environment update to finish. |

## Solution stack names

The avaiable solution stacks are available at https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html

## Development

For GitHub actions, all dependencies need to be included in the repository. Therefore, node_modules is not .gitignore'd.

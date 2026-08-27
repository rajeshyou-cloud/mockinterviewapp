import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const awsPackPath = 'apps/web/data/candidates/aws.json';
const retrievedAt = '2026-08-27';
const documentVersion = 'official-aws-evidence-depth-2026-08-27';
const dryRun = process.argv.includes('--dry-run');

const evidenceByCluster = {
  'candidate-aws-well-architected': [
    ['Operational excellence pillar', 'Design principles and operational practices', 'https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/welcome.html'],
    ['Reliability pillar', 'Design principles and failure management', 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html'],
    ['Cost optimization pillar', 'Cost-aware design practices', 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html'],
  ],
  'candidate-aws-shared-responsibility': [
    ['AWS security best practices', 'Security responsibility and identity foundations', 'https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html'],
    ['IAM best practices', 'Least privilege and identity controls', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html'],
  ],
  'candidate-aws-iam': [
    ['IAM best practices', 'Least privilege and secure access patterns', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html'],
    ['IAM temporary security credentials', 'Temporary credentials and roles', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp.html'],
    ['IAM policy evaluation logic', 'How AWS evaluates policies', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html'],
  ],
  'candidate-aws-iam-policies': [
    ['IAM policy evaluation logic', 'Policy evaluation order and explicit deny', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html'],
    ['IAM access policies', 'Identity-based and resource-based policies', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html'],
    ['IAM policy simulator', 'Testing and troubleshooting policies', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html'],
  ],
  'candidate-aws-organizations': [
    ['AWS Organizations service control policies', 'SCP governance controls', 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html'],
    ['AWS Organizations best practices', 'Multi-account governance practices', 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html'],
  ],
  'candidate-aws-vpc': [
    ['VPC examples', 'Example VPC configurations', 'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-example-private-subnets-nat.html'],
    ['Configure route tables', 'VPC route-table configuration', 'https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html'],
    ['VPC Flow Logs', 'Network observability and troubleshooting', 'https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html'],
  ],
  'candidate-aws-security-groups-nacls': [
    ['Security group rules', 'Stateful traffic filtering', 'https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html'],
    ['Network ACLs', 'Stateless subnet traffic filtering', 'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html'],
    ['VPC Reachability Analyzer', 'Connectivity troubleshooting', 'https://docs.aws.amazon.com/vpc/latest/reachability/what-is-reachability-analyzer.html'],
  ],
  'candidate-aws-route53': [
    ['Route 53 DNS routing', 'Hosted zones, records, and routing', 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring.html'],
    ['Route 53 health checks', 'DNS health checks and failover', 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html'],
    ['Route 53 best practices', 'DNS operational best practices', 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-dns.html'],
  ],
  'candidate-aws-ec2': [
    ['Amazon EC2 get started', 'Launch and connect to an instance', 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html'],
    ['Security groups for EC2', 'Instance network access controls', 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html'],
    ['Monitor Amazon EC2', 'EC2 metrics and status checks', 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring_ec2.html'],
  ],
  'candidate-aws-autoscaling-elb': [
    ['Elastic Load Balancing getting started', 'Create and test a load balancer', 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancer-getting-started.html'],
    ['Target groups for Application Load Balancers', 'Health checks and target routing', 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html'],
    ['Amazon EC2 Auto Scaling getting started', 'Create and verify an Auto Scaling group', 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/get-started-with-ec2-auto-scaling.html'],
  ],
  'candidate-aws-s3': [
    ['Amazon S3 getting started', 'Create buckets and upload objects', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/GetStartedWithS3.html'],
    ['Amazon S3 security best practices', 'Access, encryption, and public access controls', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html'],
    ['Monitoring Amazon S3', 'Metrics, events, and logging', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/monitoring-overview.html'],
  ],
  'candidate-aws-s3-security': [
    ['Amazon S3 Block Public Access', 'Public access prevention controls', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html'],
    ['Amazon S3 policy examples', 'Bucket and identity policy examples', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html'],
    ['Amazon S3 encryption', 'Server-side encryption options', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/serv-side-encryption.html'],
  ],
  'candidate-aws-ebs': [
    ['Amazon EBS volumes', 'Volume types and lifecycle', 'https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes.html'],
    ['Amazon EBS snapshots', 'Backup and restore with snapshots', 'https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html'],
    ['Monitor Amazon EBS volumes', 'Volume metrics and status', 'https://docs.aws.amazon.com/ebs/latest/userguide/using_cloudwatch_ebs.html'],
  ],
  'candidate-aws-rds': [
    ['Amazon RDS getting started', 'Create and connect to a DB instance', 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.html'],
    ['Amazon RDS backups', 'Automated backups and snapshots', 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html'],
    ['Monitoring Amazon RDS', 'RDS metrics, logs, and events', 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Monitoring.html'],
  ],
  'candidate-aws-dynamodb': [
    ['DynamoDB getting started', 'Create and query a table', 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStartedDynamoDB.html'],
    ['Read and write capacity mode', 'Capacity and throttling behavior', 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html'],
    ['Monitoring DynamoDB', 'Metrics and alarms', 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/monitoring-cloudwatch.html'],
  ],
  'candidate-aws-lambda': [
    ['Lambda getting started', 'Create and test a Lambda function', 'https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html'],
    ['Lambda execution role', 'Function permissions', 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html'],
    ['Monitoring Lambda functions', 'Metrics, logs, and tracing', 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-monitoring.html'],
  ],
  'candidate-aws-api-gateway': [
    ['API Gateway getting started', 'Create and test APIs', 'https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started.html'],
    ['Control access to API Gateway APIs', 'Authorizers and access control', 'https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-to-api.html'],
    ['API Gateway throttling', 'Throttling and quotas', 'https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html'],
    ['API Gateway logging and monitoring', 'CloudWatch logs and metrics', 'https://docs.aws.amazon.com/apigateway/latest/developerguide/monitoring-cloudwatch.html'],
  ],
  'candidate-aws-ecs-eks': [
    ['Amazon ECS getting started', 'Create and run container tasks', 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started.html'],
    ['Amazon EKS getting started', 'Create a Kubernetes cluster', 'https://docs.aws.amazon.com/eks/latest/userguide/getting-started.html'],
    ['Monitor Amazon ECS', 'Container service metrics and logs', 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-metrics.html'],
  ],
  'candidate-aws-sqs': [
    ['Amazon SQS basic examples', 'Create queues and send messages', 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-basic-examples-of-sqs.html'],
    ['Amazon SQS visibility timeout', 'Delivery and retry behavior', 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html'],
    ['Monitoring Amazon SQS', 'Queue metrics and alarms', 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html'],
  ],
  'candidate-aws-sns-eventbridge': [
    ['Amazon SNS getting started', 'Topics and subscriptions', 'https://docs.aws.amazon.com/sns/latest/dg/sns-getting-started.html'],
    ['EventBridge getting started', 'Create rules and targets', 'https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-get-started.html'],
    ['Monitoring EventBridge', 'Metrics and observability', 'https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html'],
  ],
  'candidate-aws-cloudwatch-cloudtrail': [
    ['Getting started with CloudWatch', 'Metrics, alarms, logs, and dashboards', 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/getting-started.html'],
    ['CloudWatch Logs', 'Collecting and querying logs', 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html'],
    ['What is AWS CloudTrail?', 'API activity event history', 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html'],
  ],
  'candidate-aws-cloudformation': [
    ['CloudFormation getting started', 'Create and update stacks', 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/GettingStarted.Walkthrough.html'],
    ['CloudFormation stacks', 'Stack lifecycle and updates', 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacks.html'],
    ['CloudFormation troubleshooting', 'Stack failure diagnosis', 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html'],
  ],
  'candidate-aws-kms-secrets': [
    ['AWS KMS keys', 'KMS key concepts and key material', 'https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html'],
    ['Secrets Manager concepts', 'Secrets and rotation concepts', 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html'],
    ['Monitor AWS KMS', 'CloudTrail and key usage auditing', 'https://docs.aws.amazon.com/kms/latest/developerguide/monitoring-overview.html'],
  ],
  'candidate-aws-backup-dr': [
    ['AWS Backup getting started', 'Create backup plans and recovery points', 'https://docs.aws.amazon.com/aws-backup/latest/devguide/getting-started.html'],
    ['AWS Backup restore testing', 'Recovery validation', 'https://docs.aws.amazon.com/aws-backup/latest/devguide/restore-testing.html'],
    ['Disaster recovery strategies', 'Backup and restore, pilot light, warm standby, multi-site', 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html'],
  ],
  'candidate-aws-cost': [
    ['Getting started with AWS Cost Management', 'Cost visibility and controls', 'https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started.html'],
    ['AWS Budgets', 'Budget alerts and spend control', 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html'],
    ['Cost optimization pillar', 'Cost-aware architecture practices', 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html'],
  ],
};

function contentHash(question, evidence) {
  return `sha256:${createHash('sha256').update(JSON.stringify({
    questionId: question.id,
    benchmarkVersion: question.benchmark.version,
    url: evidence.url,
    title: evidence.title,
    section: evidence.section,
  })).digest('hex')}`;
}

function evidenceItem(question, [title, section, url]) {
  const item = {
    url,
    title,
    section,
    retrievedAt,
    documentVersion,
  };
  item.contentHash = contentHash(question, item);
  return item;
}

function sourceEvidence(question) {
  const item = {
    url: question.source.url,
    title: question.source.title,
    section: question.source.title,
    retrievedAt: question.source.verified,
    documentVersion: 'official-source-link-baseline',
  };
  item.contentHash = contentHash(question, item);
  return item;
}

const questions = JSON.parse(await readFile(awsPackPath, 'utf8'));
let updated = 0;
const byCluster = {};

for (const question of questions) {
  const cluster = question.id.replace(/-\d+$/u, '');
  const extraEvidence = evidenceByCluster[cluster];
  if (!extraEvidence) continue;

  const evidence = [sourceEvidence(question), ...extraEvidence.map((item) => evidenceItem(question, item))];
  const uniqueEvidence = [...new Map(evidence.map((item) => [item.url, item])).values()];
  question.benchmark.evidence = uniqueEvidence;
  updated += 1;
  byCluster[cluster] = uniqueEvidence.length;
}

if (!dryRun) await writeFile(awsPackPath, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  dryRun,
  updated,
  clusters: Object.keys(byCluster).length,
  evidenceLinksPerCluster: byCluster,
}, null, 2));

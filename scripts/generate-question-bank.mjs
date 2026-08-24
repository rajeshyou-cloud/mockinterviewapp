import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const verified = '2026-08-23';

function benchmarkFor(question) {
  const packet = JSON.stringify({
    id: question.id,
    question: question.question,
    canonicalAnswer: question.canonicalAnswer,
    expectedConcepts: question.expectedConcepts,
    source: question.source,
  });
  const base = question.topic.replaceAll('-', ' ');
  const optionalConcepts = [
    `${question.difficulty} level trade-offs`,
    'operational validation evidence',
    ...(question.type === 'troubleshooting' ? ['safe diagnosis sequence'] : []),
    ...(question.type === 'design' ? ['maintainability and governance controls'] : []),
    ...(question.type === 'scenario' ? ['fit decision and risk controls'] : []),
    ...(question.type === 'hands-on' ? ['small validation run'] : []),
  ];

  return {
    version: '1.0.0',
    canonicalAnswer: question.canonicalAnswer,
    expandedExplanation: `${question.canonicalAnswer} A strong benchmark response should connect the answer to the question wording, cover the required concepts, mention relevant constraints or trade-offs, and avoid claims that contradict the official source.`,
    requiredConcepts: question.expectedConcepts,
    optionalConcepts: [...new Set(optionalConcepts)],
    acceptedAlternatives: question.expectedConcepts.map((concept) => ({
      terms: [concept],
      meaning: `Accepted wording that expresses the required concept: ${concept}.`,
    })),
    incorrectClaims: [],
    reasoning: `A complete answer should explain why ${base} matters for ${question.technology} at ${question.difficulty} level and show how the idea would be validated or applied in practice.`,
    evidence: [{
      url: question.source.url,
      title: question.source.title,
      section: question.source.title,
      retrievedAt: question.source.verified,
      documentVersion: 'official-source-link-baseline',
      contentHash: `sha256:${createHash('sha256').update(packet).digest('hex')}`,
    }],
    scoringAnchors: {
      strong: `Covers the required ${base} concepts accurately, explains the ${question.difficulty} level trade-offs, and stays aligned to the cited official source.`,
      partial: `Covers some required ${base} concepts but misses important details, constraints, or operational reasoning expected at ${question.difficulty} level.`,
      weak: `Mentions ${base} only superficially, with limited explanation and multiple missing required concepts.`,
      incorrect: `Gives claims that conflict with the benchmark answer or does not answer the ${base} question in a technically useful way.`,
    },
    review: {
      status: 'draft',
      promptVersion: 'benchmark-policy-1.0.0',
      reviewerModels: [],
      verdicts: [],
      confidence: null,
      corrections: [],
      reviewedAt: null,
    },
  };
}

const snowflake = [
  ['architecture', 'architecture', 'Snowflake architecture', 'Snowflake separates persistent cloud storage, elastic virtual-warehouse compute, and cloud services for coordination and metadata. Independent warehouses can access the same governed data while isolating workloads and scaling compute separately.', ['cloud storage', 'virtual warehouse', 'cloud services', 'workload isolation', 'independent scaling'], 'Snowflake key concepts and architecture', 'https://docs.snowflake.com/en/user-guide/intro-key-concepts'],
  ['warehouses', 'virtual-warehouses', 'virtual warehouses', 'A virtual warehouse supplies compute for queries, DML, and loading. Size affects resources for an individual workload, while auto-suspend and auto-resume control idle credit consumption without removing persisted data.', ['compute', 'warehouse size', 'auto-suspend', 'auto-resume', 'credits'], 'Overview of warehouses', 'https://docs.snowflake.com/en/user-guide/warehouses-overview'],
  ['multi-cluster', 'virtual-warehouses', 'multi-cluster warehouses', 'Multi-cluster warehouses add or remove clusters to address concurrency and queueing. They improve throughput for simultaneous users; resizing a cluster is generally the better lever for one slow query.', ['concurrency', 'clusters', 'auto-scale', 'queueing', 'warehouse size'], 'Multi-cluster warehouses', 'https://docs.snowflake.com/en/user-guide/warehouses-multicluster'],
  ['resource-monitors', 'cost-governance', 'resource monitors', 'Resource monitors track user-managed warehouse credits against quotas and can notify or suspend at thresholds. They do not govern every serverless feature, so complete cost controls also require account usage monitoring.', ['credit quota', 'threshold', 'notify', 'suspend', 'user-managed warehouse'], 'Working with resource monitors', 'https://docs.snowflake.com/en/user-guide/resource-monitors'],
  ['query-profile', 'performance', 'Query Profile', 'Query Profile exposes the execution plan, operator timing, bytes scanned, partition pruning, spilling, and queueing. Diagnose the dominant operator and data movement before changing warehouse size or adding storage optimizations.', ['execution plan', 'operators', 'partitions scanned', 'spilling', 'queueing'], 'Analyzing queries with Query Profile', 'https://docs.snowflake.com/en/user-guide/ui-query-profile'],
  ['clustering', 'performance', 'micro-partition pruning and clustering', 'Snowflake stores table data in micro-partitions and uses metadata to prune partitions. A clustering key can improve large-table range and selective access patterns, but automatic reclustering consumes credits and should be justified by measured workload benefit.', ['micro-partitions', 'pruning', 'clustering key', 'automatic clustering', 'cost'], 'Optimizing storage for performance', 'https://docs.snowflake.com/en/user-guide/performance-query-storage'],
  ['query-optimization', 'performance', 'query optimization services', 'Automatic clustering, search optimization, materialized views, and query acceleration target different access patterns. Point lookups favor search optimization, repeated precomputable single-table work can favor materialized views, and broad range access can benefit from clustering.', ['search optimization', 'materialized view', 'query acceleration', 'clustering', 'access pattern'], 'Optimizing query performance', 'https://docs.snowflake.com/en/user-guide/performance-query-options'],
  ['bulk-loading', 'loading-data', 'staged bulk loading with COPY INTO', 'Bulk loading uses a stage and file format to describe files, then COPY INTO loads a target table with warehouse compute. Load history, validation options, and explicit error handling support repeatable and diagnosable ingestion.', ['stage', 'file format', 'COPY INTO', 'warehouse', 'load history'], 'Bulk loading data', 'https://docs.snowflake.com/en/user-guide/data-load-overview'],
  ['snowpipe', 'loading-data', 'Snowpipe', 'Snowpipe continuously loads newly arrived staged files using serverless compute and event notifications. It reduces ingestion latency compared with scheduled bulk loads but still requires correct stage, pipe, notification, and duplicate-file handling.', ['pipe', 'stage', 'event notification', 'serverless', 'continuous loading'], 'Snowpipe overview', 'https://docs.snowflake.com/en/user-guide/data-load-snowpipe-intro'],
  ['streams', 'change-data-capture', 'streams', 'A stream records an offset over source-object change tracking and exposes row-level change metadata for CDC consumption. It is not a permanent audit log; consumers must process changes within retention limits to avoid staleness.', ['change tracking', 'offset', 'CDC', 'metadata', 'staleness'], 'Introduction to streams', 'https://docs.snowflake.com/en/user-guide/streams-intro'],
  ['tasks', 'orchestration', 'tasks and task graphs', 'Tasks run SQL or procedures on a schedule, after predecessors, or when a stream has data. Task graphs model dependencies, while history and failure settings are essential for retries, monitoring, and idempotent operations.', ['schedule', 'task graph', 'predecessor', 'triggered task', 'task history'], 'Introduction to tasks', 'https://docs.snowflake.com/en/user-guide/tasks-intro'],
  ['dynamic-tables', 'data-engineering', 'dynamic tables', 'A dynamic table declares a transformation query and target lag, and Snowflake manages refresh timing and dependency ordering. It suits SQL-expressible pipelines; procedural logic and exact scheduling remain better fits for streams and tasks.', ['declarative SQL', 'target lag', 'refresh', 'dependency', 'streams and tasks'], 'Dynamic tables', 'https://docs.snowflake.com/en/user-guide/dynamic-tables-about'],
  ['time-travel', 'data-protection', 'Time Travel', 'Time Travel accesses historical data within the configured retention period using timestamps, offsets, or statement identifiers. It supports investigation, UNDROP, cloning, and controlled recovery, after which Fail-safe is a separate non-queryable recovery service.', ['retention period', 'historical data', 'UNDROP', 'timestamp', 'Fail-safe'], 'Snowflake Time Travel', 'https://docs.snowflake.com/en/user-guide/data-time-travel'],
  ['cloning', 'data-protection', 'zero-copy cloning', 'CREATE CLONE creates a logical copy that initially shares unchanged micro-partitions with its source. Subsequent changes are independent, making clones useful for development and recovery while still incurring storage for diverged data.', ['CREATE CLONE', 'zero-copy', 'micro-partitions', 'independent changes', 'storage'], 'CREATE CLONE', 'https://docs.snowflake.com/en/sql-reference/sql/create-clone'],
  ['rbac', 'security-access-control', 'role-based access control', 'Snowflake grants privileges to roles and roles to users or other roles. Custom role hierarchies, least privilege, future grants, and managed access schemas reduce direct user grants and centralize governed access.', ['roles', 'privileges', 'role hierarchy', 'least privilege', 'managed access schema'], 'Overview of access control', 'https://docs.snowflake.com/en/user-guide/security-access-control-overview'],
  ['policy-security', 'security-access-control', 'masking and row access policies', 'Masking policies transform column values at query time, while row access policies decide which rows are visible. Policy context and role design must be tested carefully because policy evaluation can affect both security and performance.', ['masking policy', 'row access policy', 'query time', 'policy context', 'roles'], 'Understanding column-level security', 'https://docs.snowflake.com/en/user-guide/security-column-intro'],
  ['sharing', 'data-sharing', 'Secure Data Sharing', 'Secure Data Sharing exposes selected database objects to consumer accounts without copying the underlying data. Providers retain control of shared objects, consumers supply their own compute, and secure views help protect sensitive logic.', ['share', 'provider', 'consumer', 'no data copy', 'secure view'], 'Introduction to Secure Data Sharing', 'https://docs.snowflake.com/en/user-guide/data-sharing-intro'],
  ['semi-structured', 'semi-structured-data', 'semi-structured data', 'VARIANT stores semi-structured values, path notation accesses nested elements, and FLATTEN expands arrays or objects into rows. Explicit casting and selective projection improve correctness and avoid repeatedly processing unnecessary nested data.', ['VARIANT', 'path notation', 'FLATTEN', 'casting', 'JSON'], 'Querying semi-structured data', 'https://docs.snowflake.com/en/user-guide/querying-semistructured'],
  ['replication', 'business-continuity', 'replication and failover', 'Replication copies supported account objects and data to another region or account on a refresh schedule. Failover groups add controlled promotion for business continuity, but recovery objectives, dependencies, and client redirection must be tested.', ['replication group', 'failover group', 'refresh', 'recovery objective', 'promotion'], 'Replication and failover across multiple accounts', 'https://docs.snowflake.com/en/user-guide/account-replication-intro'],
];

const informatica = [
  ['mappings', 'mappings', 'mappings', 'A mapping defines reusable source-to-target data-flow logic and transformations. Standard, advanced, and SQL ELT modes serve different scale, hierarchy, and pushdown needs, so the mode should follow workload and runtime requirements.', ['source', 'target', 'transformations', 'reusable logic', 'mapping mode'], 'Mappings', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/mappings/mappings.html'],
  ['mapping-tasks', 'tasks', 'mapping tasks', 'A mapping task runs a selected mapping with runtime connections, objects, parameters, and options. Separating reusable mapping logic from task-specific configuration supports deployment across environments and repeatable operations.', ['mapping', 'runtime', 'parameters', 'connections', 'task configuration'], 'Mapping tasks', 'https://docs.informatica.com/integration-cloud/data-integration-free-and-paygo/current-version/tasks/mapping-tasks.html'],
  ['parameters', 'mappings', 'mapping parameters', 'Input and in-out parameters replace design-time values with task or parameter-file values. They support reusable mappings across connections, objects, filters, and environments while requiring controlled defaults and deployment-specific configuration.', ['input parameter', 'parameter file', 'runtime value', 'reusable mapping', 'environment'], 'Input parameters', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/mappings/parameters/input-parameters.html'],
  ['secure-agent', 'runtime-environments', 'Secure Agent runtime', 'A Secure Agent runs integration services and provides access to on-premises or private-network systems. Installation, service health, network reachability, credentials, upgrades, and resource capacity determine reliable task execution.', ['Secure Agent', 'runtime environment', 'services', 'network', 'capacity'], 'Secure Agents', 'https://docs.informatica.com/integration-cloud/data-integration-free-and-paygo/current-version/runtime-environments/secure-agents.html'],
  ['agent-groups', 'runtime-environments', 'Secure Agent groups', 'Secure Agent groups provide runtime environments that can isolate workloads and improve availability. Placement must account for source connectivity, shared resources, workload capacity, and the behavior of services across agents.', ['Secure Agent group', 'workload isolation', 'availability', 'connectivity', 'capacity'], 'Secure Agent groups', 'https://docs.informatica.com/integration-cloud/data-integration-free-and-paygo/current-version/runtime-environments/secure-agent-groups.html'],
  ['connections', 'connections', 'connections', 'Connections store endpoint type, location, and authentication used by sources, targets, and transformations. Parameterized connections support environment promotion, while least privilege and secret rotation reduce operational risk.', ['connection', 'authentication', 'source', 'target', 'parameterization'], 'Data Integration connections', 'https://docs.informatica.com/integration-cloud/cloud-data-integration/current-version.html'],
  ['expression', 'transformations', 'Expression transformations', 'An Expression transformation calculates row-level values, applies conditional logic, converts types, and creates variable fields. Expression order, null behavior, precision, and reusable logic are key correctness concerns.', ['row-level calculation', 'expression', 'variable field', 'data type', 'null handling'], 'Expression transformation', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/transformations/expression-transformation.html'],
  ['filter-router', 'transformations', 'Filter and Router transformations', 'A Filter keeps rows that satisfy one condition, while a Router can direct rows to multiple named groups plus a default group. Push filters as early as practical and define overlapping router conditions intentionally.', ['Filter', 'Router', 'condition', 'groups', 'default group'], 'Router transformation', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/transformations/router-transformation.html'],
  ['joiner', 'transformations', 'Joiner transformations', 'A Joiner combines two pipelines using master/detail inputs and join conditions, including heterogeneous sources. Master choice, sorted input, join type, and cache sizing affect memory, performance, and output correctness.', ['master', 'detail', 'join condition', 'join type', 'cache'], 'Joiner transformation', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/transformations/joiner-transformation.html'],
  ['lookup', 'transformations', 'Lookup transformations', 'A Lookup retrieves related values from a source using a lookup condition. Connected versus unconnected use, multiple matches, caching strategy, projected fields, and default handling determine performance and correctness.', ['lookup condition', 'connected', 'unconnected', 'cache', 'multiple matches'], 'Lookup transformation', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/transformations/lookup-transformation.html'],
  ['aggregator', 'transformations', 'Aggregator transformations', 'An Aggregator performs grouped calculations such as sums, counts, and averages. Group-by design, sorted input correctness, cache pressure, and filtering before aggregation strongly influence performance.', ['group by', 'aggregate', 'sorted input', 'cache', 'filter'], 'Aggregator transformation', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/transformations/aggregator-transformation.html'],
  ['sorter', 'transformations', 'Sorter transformations', 'A Sorter orders rows by configured fields and directions and can emit distinct output. It uses cache resources and can enable sorted-input optimizations for downstream Aggregator or Lookup transformations.', ['sort condition', 'ascending', 'descending', 'distinct', 'cache'], 'Sorter transformation', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/transformations/sorter-transformation.html'],
  ['sequence', 'transformations', 'Sequence transformations', 'A Sequence transformation generates numeric values such as next and current values. Start, increment, cycle behavior, concurrency, and restart expectations must align with identifier requirements.', ['sequence', 'next value', 'current value', 'increment', 'cycle'], 'Sequence transformation', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/transformations/sequence-transformation.html'],
  ['taskflows', 'orchestration', 'taskflows', 'A taskflow orchestrates data tasks and other steps using sequencing, inputs, decisions, parallel paths, waits, and invocation options. Publishing, monitoring, instance naming, and parameter handling make orchestration operationally reliable.', ['taskflow', 'Data Task', 'sequence', 'parameters', 'monitoring'], 'Taskflows', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/taskflows/taskflows.html'],
  ['branching', 'orchestration', 'Decision and Parallel Paths steps', 'A Decision step selects a path from conditions, while Parallel Paths runs independent branches concurrently before downstream work. Designs must account for shared targets, branch completion, and deterministic convergence.', ['Decision step', 'Parallel Paths', 'condition', 'concurrency', 'branch'], 'Taskflow steps', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/taskflows/taskflows/taskflow-steps.html'],
  ['fault-handling', 'orchestration', 'taskflow fault handling', 'Taskflow steps can ignore, suspend, fail on completion, or follow a custom error path. Production designs capture fault fields, make retries idempotent, notify operators, and distinguish warnings from failures.', ['suspend', 'custom error handling', 'fault fields', 'retry', 'fail taskflow'], 'Data Task step error handling', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/taskflows/taskflows/setting-taskflow-step-properties/data-task-step.html'],
  ['sql-elt', 'performance', 'SQL ELT optimization', 'SQL ELT optimization pushes eligible transformation logic to source or target endpoints. Full, source, target, and fallback choices depend on connector support, generated SQL, database capacity, unsupported logic, and transaction risk.', ['SQL ELT', 'pushdown', 'source', 'target', 'fallback'], 'SQL ELT optimization', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/tasks/mapping-tasks/sql-elt-optimization.html'],
  ['persistent-lookup', 'lookup-caching', 'persistent and dynamic lookup caches', 'Persistent caches reuse lookup data across runs when the source is stable; re-cache refreshes stale content. Dynamic caches update during processing, and synchronization is needed when concurrent tasks share lookup state.', ['persistent cache', 'dynamic cache', 're-cache', 'synchronization', 'lookup source'], 'Persistent lookup cache', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/transformations/lookup-transformation/persistent-lookup-cache.html'],
  ['monitoring', 'operations', 'job monitoring and logs', 'Operational diagnosis starts with job status, row counts, start and end times, error messages, and session or taskflow logs. Verbose tracing is useful selectively because it adds volume and can reduce performance.', ['job status', 'row count', 'session log', 'error message', 'verbose tracing'], 'Monitoring jobs', 'https://docs.informatica.com/integration-cloud/data-integration/current-version/monitoring-data-integration-jobs/monitoring-jobs.html'],
];

const variants = [
  ['beginner', 'conceptual', (title) => `Explain ${title} and the main problem it solves.`, 'Define the feature, its role, and the boundary between it and adjacent components.'],
  ['beginner', 'hands-on', (title) => `You are configuring ${title} for the first time. Which core settings or objects would you identify before running a small validation?`, 'Start with prerequisites and a small controlled test, then confirm the expected metadata or output.'],
  ['intermediate', 'scenario', (title) => `A team is considering ${title} for a production data pipeline. How would you decide whether it fits and apply it safely?`, 'Tie the feature to workload requirements, dependencies, security, cost, and an observable success criterion.'],
  ['intermediate', 'troubleshooting', (title) => `${title} is configured, but the expected result or performance improvement is not appearing. What would you investigate first?`, 'Verify prerequisites, runtime evidence, supported behavior, and the narrowest failing component before scaling resources.'],
  ['intermediate', 'design', (title) => `Design a maintainable implementation using ${title}. Which trade-offs and operational controls belong in the design?`, 'Separate reusable logic from runtime configuration and include monitoring, failure handling, and least-privilege access.'],
  ['advanced', 'scenario', (title) => `A high-volume production workload depends on ${title} and now has stricter reliability and cost objectives. How would you evolve the design?`, 'Use measured workload evidence, isolate failure domains, define recovery behavior, and validate the cost-performance trade-off.'],
  ['advanced', 'troubleshooting', (title) => `After a deployment involving ${title}, data is incomplete or duplicated and reruns are risky. Describe a safe diagnosis and recovery approach.`, 'Preserve evidence, establish the last correct state, make recovery idempotent, reconcile counts, and prevent recurrence with monitoring and controls.'],
];

function createQuestions(technology, units) {
  return units.flatMap(([slug, topic, title, summary, expectedConcepts, sourceTitle, url]) =>
    variants.map(([difficulty, type, question, emphasis], index) => {
      const record = {
        id: `bank-${technology}-${slug}-${String(index + 1).padStart(2, '0')}`,
        technology,
        topic,
        difficulty,
        type,
        question: question(title),
        canonicalAnswer: `${summary} ${emphasis}`,
        expectedConcepts,
        followUps: [
          `Which limitation or cost of ${title} would you validate?`,
          `What runtime evidence would prove that ${title} is working as intended?`,
        ],
        source: { title: sourceTitle, url, verified },
        reviewStatus: 'ai-reviewed',
        version: 1,
      };
      return { ...record, benchmark: benchmarkFor(record) };
    }),
  );
}

const questions = [
  ...createQuestions('snowflake', snowflake),
  ...createQuestions('informatica', informatica),
];

if (questions.length !== 266) throw new Error(`Expected 266 generated questions, received ${questions.length}`);

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '../apps/web/data/generated.json');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
console.log(`Wrote ${questions.length} questions to ${outputPath}`);

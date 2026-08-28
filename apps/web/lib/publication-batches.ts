import 'server-only';

import { neon } from '@neondatabase/serverless';

function getSql() {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

export async function listPublicationBatches() {
  const sql = getSql();
  if (!sql) return null;
  return sql`
    SELECT batch.*, technology.name AS technology_name,
      count(item.question_id)::int AS item_count,
      count(item.question_id) FILTER (WHERE question.review_status IN ('ai-evidence-verified', 'human-verified')
        AND current_answer.review_status IN ('ai-evidence-verified', 'human-verified')
        AND question.version = item.question_version AND current_version.benchmark_version = item.benchmark_version)::int AS ready_count
    FROM publication_batches batch
    JOIN technologies technology ON technology.id = batch.technology_id
    LEFT JOIN publication_batch_items item ON item.batch_id = batch.id
    LEFT JOIN questions question ON question.id = item.question_id
    LEFT JOIN question_versions current_version ON current_version.question_id=question.id AND current_version.version=question.version
    LEFT JOIN benchmark_answers current_answer ON current_answer.question_id=question.id AND current_answer.benchmark_version=current_version.benchmark_version
    GROUP BY batch.id, technology.name
    ORDER BY batch.created_at DESC
  `;
}

export async function getPublicationBatch(id: string) {
  const sql = getSql();
  if (!sql) return null;
  const [batches, items, decisions] = await Promise.all([
    sql`SELECT batch.*, technology.name AS technology_name FROM publication_batches batch JOIN technologies technology ON technology.id=batch.technology_id WHERE batch.id=${id}::uuid`,
    sql`SELECT item.*, question.prompt, question.review_status, question.publish_status, question.version AS current_question_version,
      current_version.benchmark_version AS current_benchmark_version, current_answer.review_status AS benchmark_review_status
      FROM publication_batch_items item JOIN questions question ON question.id=item.question_id
      JOIN question_versions current_version ON current_version.question_id=question.id AND current_version.version=question.version
      JOIN benchmark_answers current_answer ON current_answer.question_id=question.id AND current_answer.benchmark_version=current_version.benchmark_version
      WHERE item.batch_id=${id}::uuid ORDER BY item.question_id`,
    sql`SELECT * FROM publication_batch_decisions WHERE batch_id=${id}::uuid ORDER BY decided_at DESC`,
  ]);
  return batches[0] ? { batch: batches[0], items, decisions } : undefined;
}

export async function createPublicationBatch(input: {
  technologyId: string; name: string; version: string; releaseNotes: string; questionIds: string[]; actor: string;
}) {
  const sql = getSql();
  if (!sql) return null;
  const uniqueIds = [...new Set(input.questionIds)];
  if (!uniqueIds.length) throw new Error('A publication batch requires at least one question.');
  const rows = await sql`
    WITH requested AS (
      SELECT value AS question_id FROM jsonb_array_elements_text(${JSON.stringify(uniqueIds)}::jsonb)
    ), eligible AS (
      SELECT question.id, question.version, current_version.benchmark_version, question.review_status
      FROM questions question JOIN requested ON requested.question_id=question.id
      JOIN question_versions current_version ON current_version.question_id=question.id AND current_version.version=question.version
      JOIN benchmark_answers answer ON answer.question_id=question.id AND answer.benchmark_version=current_version.benchmark_version
      WHERE question.technology_id=${input.technologyId}
        AND question.review_status IN ('ai-evidence-verified', 'human-verified')
        AND answer.review_status IN ('ai-evidence-verified', 'human-verified')
        AND EXISTS (SELECT 1 FROM question_evidence_links link WHERE link.question_id=question.id)
    ), valid AS (
      SELECT count(*)::int AS eligible_count FROM eligible HAVING count(*)=${uniqueIds.length}
    ), inserted_batch AS (
      INSERT INTO publication_batches (technology_id, name, version, release_notes, created_by, updated_by)
      SELECT ${input.technologyId}, ${input.name}, ${input.version}, ${input.releaseNotes}, ${input.actor}, ${input.actor}
      FROM valid RETURNING *
    ), inserted_items AS (
      INSERT INTO publication_batch_items (batch_id, question_id, question_version, benchmark_version, review_status_at_add, added_by)
      SELECT batch.id, eligible.id, eligible.version, eligible.benchmark_version, eligible.review_status, ${input.actor}
      FROM inserted_batch batch CROSS JOIN eligible RETURNING question_id
    ), decision AS (
      INSERT INTO publication_batch_decisions (batch_id, decision, to_status, decided_by, reason, metadata)
      SELECT id, 'created', 'draft', ${input.actor}, 'Created verified publication batch',
        jsonb_build_object('itemCount', (SELECT count(*) FROM inserted_items)) FROM inserted_batch
    )
    SELECT id, status, (SELECT count(*)::int FROM inserted_items) AS item_count FROM inserted_batch
  `;
  if (!rows[0]) throw new Error('Every selected question must belong to the technology, be current, verified, and have evidence.');
  return rows[0];
}

export async function transitionPublicationBatch(input: {
  id: string; action: 'mark-ready' | 'approve' | 'publish' | 'unpublish' | 'retire'; actor: string; reason: string;
}) {
  const sql = getSql();
  if (!sql) return null;
  const transitions = {
    'mark-ready': { from: 'draft', to: 'ready', decision: 'marked_ready' },
    approve: { from: 'ready', to: 'approved', decision: 'approved' },
    publish: { from: 'approved', to: 'published', decision: 'published' },
    unpublish: { from: 'published', to: 'approved', decision: 'unpublished' },
    retire: { from: 'approved', to: 'retired', decision: 'retired' },
  } as const;
  const transition = transitions[input.action];
  const rows = await sql`
    WITH ready AS (
      SELECT batch.id FROM publication_batches batch
      WHERE batch.id=${input.id}::uuid AND batch.status=${transition.from}
        AND (${input.action !== 'publish'} OR NOT EXISTS (
          SELECT 1 FROM publication_batches other
          WHERE other.technology_id=batch.technology_id AND other.status='published' AND other.id<>batch.id
        ))
        AND (${input.action !== 'mark-ready'} OR (
          EXISTS (SELECT 1 FROM publication_batch_items WHERE batch_id=batch.id)
          AND NOT EXISTS (
            SELECT 1 FROM publication_batch_items item JOIN questions question ON question.id=item.question_id
            JOIN question_versions current_version ON current_version.question_id=question.id AND current_version.version=question.version
            JOIN benchmark_answers current_answer ON current_answer.question_id=question.id AND current_answer.benchmark_version=current_version.benchmark_version
            WHERE item.batch_id=batch.id AND (
              question.review_status NOT IN ('ai-evidence-verified', 'human-verified')
              OR current_answer.review_status NOT IN ('ai-evidence-verified', 'human-verified')
              OR question.version<>item.question_version OR current_version.benchmark_version<>item.benchmark_version
            )
          )
        ))
    ), updated AS (
      UPDATE publication_batches batch SET status=${transition.to}, updated_at=now(), updated_by=${input.actor},
        approved_by=CASE WHEN ${input.action}='approve' THEN ${input.actor} ELSE approved_by END,
        approved_at=CASE WHEN ${input.action}='approve' THEN now() ELSE approved_at END,
        published_by=CASE WHEN ${input.action}='publish' THEN ${input.actor} ELSE published_by END,
        published_at=CASE WHEN ${input.action}='publish' THEN now() ELSE published_at END
      FROM ready WHERE batch.id=ready.id RETURNING batch.*
    ), question_state AS (
      UPDATE questions question SET publish_status=CASE WHEN ${input.action}='publish' THEN 'published' ELSE 'unpublished' END,
        updated_at=now(), updated_by=${input.actor}
      WHERE ${input.action} IN ('publish', 'unpublish') AND question.id IN (
        SELECT item.question_id FROM publication_batch_items item JOIN updated ON updated.id=item.batch_id
      ) RETURNING question.id
    ), decision AS (
      INSERT INTO publication_batch_decisions (batch_id, decision, from_status, to_status, decided_by, reason,
        metadata) SELECT id, ${transition.decision}, ${transition.from}, ${transition.to}, ${input.actor}, ${input.reason},
        jsonb_build_object('affectedQuestions', (SELECT count(*) FROM question_state)) FROM updated
    ) SELECT * FROM updated
  `;
  return rows[0] ?? undefined;
}

export async function rollbackPublicationBatch(input: { currentBatchId: string; targetBatchId: string; actor: string; reason: string }) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    WITH target_candidate AS (
      SELECT target.id, target.status, target.technology_id
      FROM publication_batches target JOIN publication_batches current ON current.id=${input.currentBatchId}::uuid
      WHERE target.id=${input.targetBatchId}::uuid AND current.status='published'
        AND target.technology_id=current.technology_id AND target.status IN ('approved', 'retired')
        AND EXISTS (SELECT 1 FROM publication_batch_items WHERE batch_id=target.id)
        AND NOT EXISTS (SELECT 1 FROM publication_batch_items item JOIN questions question ON question.id=item.question_id
          JOIN question_versions current_version ON current_version.question_id=question.id AND current_version.version=question.version
          JOIN benchmark_answers current_answer ON current_answer.question_id=question.id AND current_answer.benchmark_version=current_version.benchmark_version
          WHERE item.batch_id=target.id AND (question.review_status NOT IN ('ai-evidence-verified','human-verified')
            OR current_answer.review_status NOT IN ('ai-evidence-verified','human-verified')
            OR question.version<>item.question_version OR current_version.benchmark_version<>item.benchmark_version))
    ), current_batch AS (
      UPDATE publication_batches SET status='rolled_back', rolled_back_by=${input.actor}, rolled_back_at=now(),
        rollback_of_batch_id=${input.targetBatchId}::uuid, updated_at=now(), updated_by=${input.actor}
      WHERE id=${input.currentBatchId}::uuid AND status='published' AND EXISTS (SELECT 1 FROM target_candidate) RETURNING *
    ), target_batch AS (
      UPDATE publication_batches target SET status='published', published_by=${input.actor}, published_at=now(),
        updated_at=now(), updated_by=${input.actor}
      FROM current_batch current, target_candidate candidate WHERE target.id=candidate.id
      RETURNING target.*
    ), unpublish_questions AS (
      UPDATE questions SET publish_status='unpublished', updated_at=now(), updated_by=${input.actor}
      WHERE technology_id=(SELECT technology_id FROM current_batch) RETURNING id
    ), publish_questions AS (
      UPDATE questions SET publish_status='published', updated_at=now(), updated_by=${input.actor}
      WHERE id IN (SELECT item.question_id FROM publication_batch_items item JOIN target_batch target ON target.id=item.batch_id)
      RETURNING id
    ), decisions AS (
      INSERT INTO publication_batch_decisions (batch_id, decision, from_status, to_status, decided_by, reason, metadata)
      SELECT id, 'rolled_back', 'published', 'rolled_back', ${input.actor}, ${input.reason}, jsonb_build_object('targetBatchId', ${input.targetBatchId}) FROM current_batch
      UNION ALL SELECT target.id, 'published', candidate.status, 'published', ${input.actor}, ${input.reason}, jsonb_build_object('rollbackFromBatchId', ${input.currentBatchId}) FROM target_batch target JOIN target_candidate candidate ON candidate.id=target.id
    ) SELECT * FROM target_batch
  `;
  return rows[0] ?? undefined;
}

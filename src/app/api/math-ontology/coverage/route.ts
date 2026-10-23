import { handleOntologyRead } from '@/lib/math-ontology/retrieval/read.server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const GET = (request: Request) => handleOntologyRead(request);

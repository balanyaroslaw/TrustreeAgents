import type { z } from 'zod';
import type { qaResultSchema } from './qa-result.schema';

export type QaResult = z.infer<typeof qaResultSchema>;

export type QaCoverageEntry = QaResult['coverage'][number];

export type QaFileCoverage = QaResult['fileCoverage'][number];

export type QaTestFile = QaResult['testFiles'][number];

export type QaDefect = QaResult['defects'][number];

export type QaNotTestedEntry = QaResult['notTested'][number];

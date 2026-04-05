import type {
	FollowUpTaskModel,
	InterviewModel,
	JobModel,
	PipelineStageHistoryModel,
	TimelineEventModel,
} from '@/generated/prisma/models';
import { job_activity_type, stage } from '@/generated/prisma/enums';

export type Job = JobModel;
export type FollowUpTask = FollowUpTaskModel;
export type Interview = InterviewModel;
export type PipelineStageHistory = PipelineStageHistoryModel;
export type TimelineEvent = TimelineEventModel;

export { job_activity_type, stage };

export type JobActivityType =
	(typeof job_activity_type)[keyof typeof job_activity_type];
export type PipelineStage = (typeof stage)[keyof typeof stage];

export const PIPELINE_STAGE_VALUES = Object.values(stage);
export const JOB_ACTIVITY_TYPE_VALUES = Object.values(job_activity_type);

import { JOB_FORM_STEPS, type JobFormStepId } from '@/lib/jobs/multi-step-form';

type JobFormStepperProps = {
  activeStep: JobFormStepId;
  onStepChange: (step: JobFormStepId) => void;
};

export default function JobFormStepper({
  activeStep,
  onStepChange,
}: JobFormStepperProps) {
  const activeIndex = JOB_FORM_STEPS.findIndex(
    (step) => step.id === activeStep,
  );

  return (
    <nav aria-label="Job form steps" className="job-stepper-wrap">
      {JOB_FORM_STEPS.map((step, index) => {
        const isActive = step.id === activeStep;
        const isComplete = index < activeIndex;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepChange(step.id)}
            className="job-stepper-item"
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className="job-stepper-circle"
              data-active={isActive}
              data-complete={isComplete}
              aria-hidden="true"
            >
              <span className="job-stepper-number">{index + 1}</span>
            </span>
            <span className="job-stepper-label">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

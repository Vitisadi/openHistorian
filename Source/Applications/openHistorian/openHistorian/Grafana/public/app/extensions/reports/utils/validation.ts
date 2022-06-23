import { FormRequiredFields, Report, StepKey } from '../../types';

const arrayFieldIsValid = (field: Report[keyof Report]) => {
  if (Array.isArray(field)) {
    return field?.length;
  }

  return true;
};

export const getMissingFields = (report: Report, id?: StepKey) => {
  const requiredFields: FormRequiredFields = [
    { step: StepKey.SelectDashboard, fields: ['dashboards'] },
    { step: StepKey.FormatReport, fields: ['formats'] },
    { step: StepKey.Share, fields: ['name', 'recipients'] },
  ];
  // Validate dashboards separately
  const hasMissingDashboard = !report.dashboards?.[0]?.dashboard?.name;
  if (!id) {
    // Validate all fields
    const requiredFieldNames = requiredFields.flatMap((field) => field.fields);
    return (
      requiredFieldNames?.some((field) => !report[field] || !arrayFieldIsValid(report[field])) || hasMissingDashboard
    );
  }
  if (id === StepKey.SelectDashboard) {
    return hasMissingDashboard;
  }

  const requiredFieldNames = requiredFields.find((field) => field.step === id)?.fields;
  return requiredFieldNames?.some((field) => !report[field] || !arrayFieldIsValid(report[field])); // Validate array fields also for display in stepper
};

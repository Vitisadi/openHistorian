import { css } from '@emotion/css';
import React, { useEffect } from 'react';
import { Control, useFieldArray, useForm, UseFormSetValue } from 'react-hook-form';
import { connect, ConnectedProps } from 'react-redux';

import { GrafanaTheme2, TimeRange } from '@grafana/data';
import { Button, Field, FieldSet, InlineField, InputControl, TimeRangeInput, useStyles2 } from '@grafana/ui';
import { DashboardPickerByID, DashboardPickerItem } from 'app/core/components/editors/DashboardPickerByID';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { variableAdapters } from 'app/features/variables/adapters';
import { hasOptions } from 'app/features/variables/guard';
import { cleanUpVariables } from 'app/features/variables/state/actions';
import { getVariablesByKey } from 'app/features/variables/state/selectors';
import { VariableHide, VariableModel } from 'app/features/variables/types';

import { EnterpriseStoreState, ReportDashboard, ReportFormData, StepKey } from '../../types';
import { getRange, parseRange } from '../../utils/time';
import { initVariables } from '../state/actions';
import { updateReportProp } from '../state/reducers';
import { canEditReport } from '../utils/permissions';
import { applyUrlValues, getUrlValues } from '../utils/url';
import { variablesToCsv } from '../utils/variables';

import ReportForm from './ReportForm';

interface OwnProps extends GrafanaRouteComponentProps<{ id: string }> {}

const mapStateToProps = (state: EnterpriseStoreState) => {
  const { report } = state.reports;
  return {
    report,
    // This prop is necessary to ensure the component updates when the variables change
    templating: state.templating.keys,
  };
};

const mapActionsToProps = {
  updateReportProp,
  initVariables,
  cleanUpVariables,
};

const connector = connect(mapStateToProps, mapActionsToProps);
export type Props = ConnectedProps<typeof connector> & OwnProps;

const defaultDashboard: ReportDashboard = {
  dashboard: undefined,
  timeRange: { from: '', to: '' },
  reportVariables: {},
};
export const SelectDashboards = ({ report, updateReportProp, initVariables, cleanUpVariables }: Props) => {
  const {
    handleSubmit,
    control,
    formState: { isDirty },
    setValue,
    watch,
  } = useForm({
    defaultValues: { dashboards: applyUrlValues(report).dashboards || [defaultDashboard] },
  });
  const {
    fields,
    append: addDashboard,
    remove: removeDashboard,
    //@ts-expect-error react-hook-form doesn't have good support for recursive types
  } = useFieldArray({
    control,
    name: 'dashboards',
    keyName: 'fieldId',
  });
  //@ts-expect-error
  const watchDashboards = watch('dashboards');
  const styles = useStyles2(getStyles);

  useEffect(() => {
    const urlValues = getUrlValues();

    if (!urlValues) {
      return;
    }
    // If new report is created, apply the values from URL params for variables
    const { dashboard, variables } = urlValues;
    if (variables && dashboard.uid) {
      initVariables(dashboard.uid, variables);
    }

    if (dashboard.uid) {
      setValue('dashboards.0.dashboard', { ...dashboard, id: parseInt(dashboard.id!, 10) } as any, {
        shouldDirty: true,
      });
    }
  }, [initVariables, report, setValue]);

  const onDashboardChange = (index: number) => (dashboard: DashboardPickerItem | undefined, uid?: string) => {
    // Reset time range when dashboard changes
    setValue(`dashboards.${index}.timeRange` as const, { from: '', to: '' });
    if (!dashboard) {
      if (uid) {
        cleanUpVariables(uid);
      }
      return;
    }
    if (dashboard.uid) {
      const savedDashboard = report.dashboards?.[index];
      const defaultVars = dashboard.id === savedDashboard?.dashboard?.id ? savedDashboard?.reportVariables : undefined;
      initVariables(dashboard.uid, defaultVars);
    }
  };

  const saveData = (data: Partial<ReportFormData>) => {
    const dashboards = data.dashboards
      ?.filter(({ dashboard }) => dashboard?.uid)
      .map(({ dashboard, timeRange }) => {
        const uid = dashboard?.uid;
        return {
          dashboard: uid
            ? {
                uid,
                id: dashboard?.id,
                name: dashboard?.name,
              }
            : undefined,
          timeRange: parseRange(timeRange?.raw),
          reportVariables: uid
            ? variablesToCsv(getVariablesByKey(uid).filter((v) => v.hide !== VariableHide.hideVariable))
            : undefined,
        };
      });

    if (isDirty) {
      updateReportProp({ ...report, dashboards: dashboards?.length ? dashboards : [defaultDashboard] });
    }
  };

  return (
    <ReportForm activeStep={StepKey.SelectDashboard} onSubmit={handleSubmit(saveData)} confirmRedirect={isDirty}>
      <FieldSet label={'1. Select dashboard'}>
        <>
          {fields.map((f, index) => {
            const uid = watchDashboards[index].dashboard?.uid || '';
            const variables = uid ? getVariablesByKey(uid) : [];
            return (
              <div key={f.fieldId} className={styles.section}>
                <SelectDashboard
                  field={f}
                  dashboardUid={uid}
                  onDashboardChange={onDashboardChange(index)}
                  variables={variables}
                  control={control}
                  index={index}
                  setValue={setValue}
                  selectedDashboards={watchDashboards}
                />
                {fields.length > 1 && (
                  <Button
                    className={styles.removeBtn}
                    variant={'secondary'}
                    fill={'outline'}
                    icon={'trash-alt'}
                    onClick={() => removeDashboard(index)}
                  >
                    Remove dashboard
                  </Button>
                )}
              </div>
            );
          })}
          <Button type={'button'} variant={'secondary'} onClick={() => addDashboard(defaultDashboard)}>
            + Add another dashboard
          </Button>
        </>
      </FieldSet>
    </ReportForm>
  );
};

interface SelectDashboardProps {
  field: ReportDashboard;
  index: number;
  variables: VariableModel[];
  onDashboardChange: (db: DashboardPickerItem | undefined, uid?: string) => void;
  control: Control<{ dashboards: ReportDashboard[] }>;
  dashboardUid?: string;
  setValue: UseFormSetValue<{ dashboards: ReportDashboard[] }>;
  selectedDashboards: ReportDashboard[];
}

export const SelectDashboard = ({
  field,
  index,
  onDashboardChange,
  variables,
  control,
  dashboardUid,
  setValue,
  selectedDashboards,
}: SelectDashboardProps) => {
  const timeRange = getRange(field.timeRange);
  const reportVariables = variables.filter((v) => v.hide !== VariableHide.hideVariable);
  const excludedDashboards = selectedDashboards
    .filter(({ dashboard }) => dashboard?.uid)
    .map(({ dashboard }) => dashboard!.uid);

  return (
    <>
      <Field label="Source dashboard" required>
        <InputControl
          name={`dashboards.${index}.dashboard` as const}
          control={control}
          render={({ field: { onChange, ref, ...fieldProps } }) => {
            return (
              <DashboardPickerByID
                {...fieldProps}
                aria-label={'Source dashboard'}
                isClearable
                optionLabel={'name'}
                disabled={!canEditReport}
                excludedDashboards={excludedDashboards}
                onChange={(dashboard) => {
                  onDashboardChange(dashboard, dashboardUid);
                  onChange(dashboard);
                }}
              />
            );
          }}
        />
      </Field>
      {dashboardUid !== undefined && Boolean(reportVariables.length) && (
        <Field label={'Template variables'}>
          <>
            {reportVariables.map((variable) => {
              const { picker: Picker, setValue: updateVariable } = variableAdapters.get(variable.type);
              return (
                <InlineField label={variable.name} key={variable.name} labelWidth={16} disabled={!canEditReport}>
                  <Picker
                    variable={variable}
                    onVariableChange={(updated: VariableModel) => {
                      if (hasOptions(updated)) {
                        updateVariable(updated, updated.current);
                        setValue(`dashboards.${index}.reportVariables`, variablesToCsv([updated]), {
                          shouldDirty: true,
                        });
                      }
                    }}
                  />
                </InlineField>
              );
            })}
          </>
        </Field>
      )}
      <Field
        label="Time range"
        description="Generate report with the data from specified time range. If custom time range is empty the time range from the report's dashboard is used."
        disabled={!canEditReport}
      >
        <InputControl
          control={control}
          name={`dashboards.${index}.timeRange` as const}
          defaultValue={timeRange}
          render={({ field: { ref, value, ...field } }) => {
            return <TimeRangeInput value={(value || timeRange) as unknown as TimeRange} {...field} clearable />;
          }}
        />
      </Field>
    </>
  );
};
export default connector(SelectDashboards);

const getStyles = (theme: GrafanaTheme2) => {
  return {
    removeBtn: css`
      margin-bottom: ${theme.spacing(2)};
    `,
    section: css`
      padding-bottom: ${theme.spacing(3)};
    `,
  };
};

import React from 'react';
import { useForm } from 'react-hook-form';
import { connect, ConnectedProps } from 'react-redux';

import { AppEvents, urlUtil } from '@grafana/data';
import { featureEnabled, reportInteraction } from '@grafana/runtime';
import { Checkbox, Field, FieldSet, LinkButton, RadioButtonGroup, InputControl, VerticalGroup } from '@grafana/ui';
import { appEvents } from 'app/core/core';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { getVariablesByKey } from 'app/features/variables/state/selectors';

import {
  EnterpriseStoreState,
  ReportFormData,
  ReportLayout,
  reportLayouts,
  reportOrientations,
  StepKey,
} from '../../types';
import { getRange } from '../../utils/time';
import { updateReportProp } from '../state/reducers';
import { getLastUid } from '../state/selectors';
import { dashboardsInvalid } from '../utils/dashboards';
import { canEditReport } from '../utils/permissions';
import { getRendererMajorVersion } from '../utils/renderer';

import ReportForm from './ReportForm';

type FormatData = Pick<ReportFormData, 'formats' | 'options'>;

interface OwnProps extends GrafanaRouteComponentProps<{ id: string }> {}

const mapStateToProps = (state: EnterpriseStoreState) => {
  const lastUid = getLastUid(state);
  return {
    report: state.reports.report,
    variables: lastUid ? getVariablesByKey(lastUid) : [],
  };
};

const mapActionsToProps = {
  updateReportProp,
};

const connector = connect(mapStateToProps, mapActionsToProps);
export type Props = ConnectedProps<typeof connector> & OwnProps;

const descriptions = new Map<ReportLayout, string>([
  ['grid', 'Display the panels in their positions on the dashboard.'],
  ['simple', 'Display one panel per row.'],
]);

export const FormatReport = ({ report, updateReportProp }: Props) => {
  const {
    handleSubmit,
    control,
    register,
    watch,
    formState: { isDirty },
  } = useForm();
  const { dashboards, formats, options, name } = report || {};
  const orientation = options.orientation || 'landscape';
  const layout = options.layout || 'grid';
  const watchLayout = watch('options.layout', layout);
  const watchOrientation = watch('options.orientation', orientation);
  const watchFormats = watch('formats', formats) || [];
  const rendererMajorVersion = getRendererMajorVersion();
  const previewEnabled = featureEnabled('reports.email') && !dashboardsInvalid(report.dashboards);

  const saveData = ({ formats, options }: FormatData) => {
    if (isDirty) {
      updateReportProp({ ...report, options: { ...report.options, ...options }, formats });
    }
  };

  const getPreviewPDFUrl = () => {
    if (dashboardsInvalid(dashboards)) {
      return undefined;
    }

    const params: any = {
      title: name,
    };

    if (watchOrientation) {
      params.orientation = watchOrientation;
    }

    if (watchLayout) {
      params.layout = watchLayout;
    }

    params.dashboards = JSON.stringify(
      dashboards.map((db) => {
        const { from, to } = getRange(db.timeRange).raw;
        return {
          dashboard: { uid: db.dashboard?.uid },
          timeRange: { from: from.valueOf().toString(), to: to.valueOf().toString() },
          reportVariables: db.reportVariables,
        };
      })
    );

    return urlUtil.appendQueryToUrl(`api/reports/render/pdfs/`, urlUtil.toUrlParams(params));
  };

  return (
    <ReportForm activeStep={StepKey.FormatReport} onSubmit={handleSubmit(saveData)} confirmRedirect={isDirty}>
      <FieldSet label={'2. Format report'} disabled={!canEditReport}>
        <FieldSet>
          <VerticalGroup>
            <Checkbox
              {...register('formats')}
              htmlValue="pdf"
              label="Attach the report as a PDF"
              defaultChecked={formats.includes('pdf')}
            />
            <Checkbox
              {...register('formats')}
              htmlValue="image"
              label="Embed a dashboard image in the email"
              defaultChecked={formats.includes('image')}
            />
            <Checkbox
              {...register('formats')}
              htmlValue="csv"
              label="Attach a CSV file of table panel data"
              defaultChecked={formats.includes('csv')}
              onChange={(val) => {
                const enabled = val.currentTarget.checked;
                if (enabled && rendererMajorVersion !== null && rendererMajorVersion < 3) {
                  appEvents.emit(AppEvents.alertError, [
                    'To export CSV files, you must update the Grafana Image Renderer plugin.',
                  ]);
                }
              }}
            />
          </VerticalGroup>
        </FieldSet>
        {watchFormats.includes('pdf') && (
          <FieldSet label={'Style the PDF'}>
            <Field label="Orientation">
              <InputControl
                name={'options.orientation'}
                control={control}
                defaultValue={orientation}
                render={({ field: { ref, ...field } }) => {
                  return <RadioButtonGroup {...field} options={reportOrientations} size={'md'} />;
                }}
              />
            </Field>
            <Field label="Layout" description={descriptions.get(watchLayout)}>
              <InputControl
                name={'options.layout'}
                control={control}
                defaultValue={layout}
                render={({ field: { ref, ...field } }) => {
                  return <RadioButtonGroup {...field} options={reportLayouts} size={'md'} />;
                }}
              />
            </Field>
            <Field disabled={!previewEnabled}>
              <LinkButton
                onClick={() => previewEnabled && reportInteraction('reports_preview_pdf')}
                icon={'external-link-alt'}
                href={getPreviewPDFUrl()}
                size="xs"
                target="_blank"
                rel="noreferrer noopener"
                variant="secondary"
              >
                Preview PDF
              </LinkButton>
            </Field>
          </FieldSet>
        )}
      </FieldSet>
    </ReportForm>
  );
};

export default connector(FormatReport);

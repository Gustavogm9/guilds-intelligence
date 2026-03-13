"use client";

import type { AnchorHTMLAttributes } from "react";

import { trackEvent } from "@/lib/tracking";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
    reportId: string;
    fileType: string;
};

export function ReportDownloadLink({ reportId, fileType, onClick, ...props }: Props) {
    return (
        <a
            {...props}
            onClick={(event) => {
                trackEvent("report_download", {
                    report_id: reportId,
                    file_type: fileType,
                });
                onClick?.(event);
            }}
        />
    );
}

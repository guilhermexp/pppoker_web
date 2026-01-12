"use client";

import { useUserQuery } from "@/hooks/use-user";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { resumableUpload } from "@/utils/upload";
import { createClient } from "@midpoker/supabase/client";
import { cn } from "@midpoker/ui/cn";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";

type UploadResult = {
  filename: string;
  file: File;
};

type Props = {
  children: ReactNode;
  onUpload?: (
    results: {
      file_path: string[];
      mimetype: string;
      size: number;
    }[],
  ) => void;
};

export function VaultUploadZone({ onUpload, children }: Props) {
  const trpc = useTRPC();
  const { data: user } = useUserQuery();
  const supabase = createClient();
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [toastId, setToastId] = useState<string | null>(null);
  const uploadProgress = useRef<number[]>([]);
  const { toast, dismiss, update } = useToast();
  const t = useI18n();

  const processDocumentMutation = useMutation(
    trpc.documents.processDocument.mutationOptions(),
  );

  useEffect(() => {
    if (!toastId && showProgress) {
      const { id } = toast({
        title: t("vault.upload_title", {
          count: uploadProgress.current.length,
        }),
        progress,
        variant: "progress",
        description: t("vault.upload_description"),
        duration: Number.POSITIVE_INFINITY,
      });

      setToastId(id);
    } else if (toastId) {
      update(toastId, {
        id: toastId,
        title: t("vault.upload_title", {
          count: uploadProgress.current.length,
        }),
        progress,
        variant: "progress",
      });
    }
  }, [showProgress, progress, toastId, t]);

  const onDrop = async (files: File[]) => {
    // NOTE: If onDropRejected
    if (!files.length) {
      return;
    }

    // Set default progress
    uploadProgress.current = files.map(() => 0);

    setShowProgress(true);

    // Add uploaded (team_id)
    const path = [user?.teamId] as string[];

    try {
      const results = (await Promise.all(
        files.map(async (file: File, idx: number) =>
          resumableUpload(supabase, {
            bucket: "vault",
            path,
            file,
            onProgress: (bytesUploaded: number, bytesTotal: number) => {
              uploadProgress.current[idx] = (bytesUploaded / bytesTotal) * 100;

              const _progress = uploadProgress.current.reduce(
                (acc, currentValue) => {
                  return acc + currentValue;
                },
                0,
              );

              setProgress(Math.round(_progress / files.length));
            },
          }),
        ),
      )) as UploadResult[];

      // Trigger the upload jobs
      processDocumentMutation.mutate(
        results.map((result) => ({
          filePath: [...path, result.filename],
          mimetype: result.file.type,
          size: result.file.size,
        })),
      );

      // Reset once done
      uploadProgress.current = [];

      setProgress(0);
      toast({
        title: t("vault.upload_success"),
        variant: "success",
        duration: 2000,
      });

      setShowProgress(false);
      setToastId(null);
      if (toastId) {
        dismiss(toastId);
      }

      // Type the results properly for onUpload callback
      const typedResults = results.map((result) => ({
        file_path: [...path, result.filename],
        mimetype: result.file.type,
        size: result.file.size,
      }));

      onUpload?.(typedResults);
    } catch {
      toast({
        duration: 2500,
        variant: "error",
        title: t("vault.upload_error"),
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: ([reject]: FileRejection[]) => {
      if (reject?.errors.find(({ code }) => code === "file-too-large")) {
        toast({
          duration: 2500,
          variant: "error",
          title: t("vault.file_too_large"),
        });
      }

      if (reject?.errors.find(({ code }) => code === "file-invalid-type")) {
        toast({
          duration: 2500,
          variant: "error",
          title: t("vault.file_invalid_type"),
        });
      }
    },
    maxSize: 5000000, // 5MB
    maxFiles: 25,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
      "application/vnd.oasis.opendocument.presentation": [".odp"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "text/markdown": [".md"],
      "application/rtf": [".rtf"],
      "application/zip": [".zip"],
    },
  });

  return (
    <div
      className="relative h-full"
      {...getRootProps({ onClick: (evt) => evt.stopPropagation() })}
    >
      <div className="absolute top-0 right-0 left-0 z-[51] w-full pointer-events-none h-[calc(100vh-150px)]">
        <div
          className={cn(
            "bg-background dark:bg-[#1A1A1A] h-full w-full flex items-center justify-center text-center",
            isDragActive ? "visible" : "invisible",
          )}
        >
          <input {...getInputProps()} id="upload-files" />

          <div className="flex flex-col items-center justify-center gap-2">
            <p className="text-xs">
              {t("vault.drop_description")} <br />
              {t("vault.drop_max_files")}
            </p>

            <span className="text-xs text-[#878787]">
              {t("vault.drop_max_size")}
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

import * as React from "react"
import Image from "next/image"
import type { FileWithPreview } from "@/types"
import { Cross2Icon, UploadIcon } from "@radix-ui/react-icons"
import Dropzone, {
  type DropzoneProps,
  type FileRejection,
} from "react-dropzone"
import { toast } from "sonner"

import { cn, formatBytes } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface FileUploaderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "accept"> {
  /**
   * Function to be called when the value changes.
   * @type React.Dispatch<React.SetStateAction<FileWithPreview[] | null>>
   * @default undefined
   * @example onValueChange={(files) => setFiles(files)}
   */
  onValueChange?: React.Dispatch<React.SetStateAction<FileWithPreview[] | null>>

  /**
   * Function to be called when files are uploaded.
   * @type (files: File[]) => Promise<void>
   * @default undefined
   * @example onUpload={(files) => uploadFiles(files)}
   */
  onUpload?: (files: File[]) => Promise<void>

  /**
   * Accepted file types for the uploader.
   * @type { [key: string]: string[]}
   * @default undefined
   * @example accept={["image/png", "image/jpeg"]}
   */
  accept?: DropzoneProps["accept"]

  /**
   * Maximum file size for the uploader.
   * @type number | undefined
   * @default 1024 * 1024 * 2 // 2MB
   * @example maxSize={1024 * 1024 * 2} // 2MB
   */
  maxSize?: DropzoneProps["maxSize"]

  /**
   * Maximum number of files for the uploader.
   * @type number | undefined
   * @default 1
   * @example maxFiles={5}
   */
  maxFiles?: DropzoneProps["maxFiles"]

  /**
   * Whether the uploader is currently uploading files.
   * @type boolean
   * @default false
   * @example isUploading={false}
   */
  isUploading?: boolean
}

export function FileUploader({
  onValueChange,
  onUpload,
  accept = { "image/*": [] },
  multiple,
  maxSize = 1024 * 1024 * 2,
  maxFiles = 1,
  isUploading = false,
  disabled = false,
  className,
  ...props
}: FileUploaderProps) {
  const [files, setFiles] = React.useState<FileWithPreview[] | null>(null)

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (files && files.length + acceptedFiles.length > maxFiles) {
        toast.error(`Cannot upload more than ${maxFiles} files`)
        return
      }

      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          id: crypto.randomUUID(),
          preview: URL.createObjectURL(file),
        })
      )

      setFiles((prevFiles) =>
        prevFiles ? [...prevFiles, ...newFiles] : newFiles
      )
      onValueChange?.(files ? [...files, ...newFiles] : newFiles)

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file }) => {
          toast.error(`File ${file.name} was rejected`)
        })
      }

      if (onUpload) {
        if (
          !files ||
          files.length === 0 ||
          files.length + acceptedFiles.length > maxFiles
        )
          return

        const target = files.length > 0 ? "files" : "file"

        toast.promise(onUpload(acceptedFiles), {
          loading: `Uploading ${target}...`,
          success: () => {
            setFiles(null)
            onValueChange?.(null)

            return `${target} uploaded`
          },
          error: `Failed to upload ${target}`,
        })
      }
    },

    [files, maxFiles, onUpload, onValueChange]
  )

  function onRemove(file: FileWithPreview) {
    if (!files) return
    const newFiles = files.filter((f) => f.id !== file.id)
    setFiles(newFiles)
    onValueChange?.(newFiles)
  }

  // Revoke preview url when component unmounts
  React.useEffect(() => {
    return () => {
      if (!files) return
      files.forEach((file) => URL.revokeObjectURL(file.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card className="relative flex flex-col gap-6 overflow-hidden p-6">
      <Dropzone
        onDrop={onDrop}
        accept={accept}
        maxSize={maxSize}
        maxFiles={maxFiles}
        multiple={maxFiles > 1 || multiple}
        disabled={disabled || (files?.length ?? 0) >= maxFiles}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps()}
            className={cn(
              "group relative grid h-48 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/25",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isDragActive && "border-muted-foreground/50",
              disabled ||
                ((files?.length ?? 0) >= maxFiles &&
                  "pointer-events-none opacity-60"),
              className
            )}
          >
            <input {...getInputProps()} {...props} />
            {isUploading ? (
              <div className="group grid w-full place-items-center gap-1 sm:px-10">
                <UploadIcon
                  className="size-9 animate-pulse text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                <div className="rounded-full border border-dashed p-3">
                  <UploadIcon
                    className="size-7 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <p className="font-medium text-muted-foreground">
                  Drop the files here
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                <div className="rounded-full border border-dashed p-3">
                  <UploadIcon
                    className="size-7 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <div className="space-y-px">
                  <p className="font-medium text-muted-foreground">
                    Drag {`'n'`} drop files here, or click to select files
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    You can upload
                    {maxFiles > 1
                      ? ` ${maxFiles === Infinity ? "unlimited" : maxFiles}
                      files (up to ${formatBytes(maxSize)} each)`
                      : ` a file with ${formatBytes(maxSize)}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Dropzone>
      {files?.length ? (
        <ScrollArea className="h-full px-4">
          <div className="max-h-48 space-y-4 ">
            {files?.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onRemove={() => onRemove(file)}
              />
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </Card>
  )
}

interface FileCardProps {
  file: FileWithPreview
  onRemove: () => void
}

function FileCard({ file, onRemove }: FileCardProps) {
  return (
    <div className="relative flex items-center space-x-4">
      <div className="flex flex-1 space-x-4">
        <Image
          src={file.preview}
          alt={file.name}
          width={48}
          height={48}
          loading="lazy"
          className="size-12 shrink-0 rounded-md object-cover"
        />
        <div className="flex flex-col">
          <p className="line-clamp-1 text-sm font-medium text-foreground/80">
            {file.name.slice(0, 45)}.{file.type.split("/")[1]}
          </p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)}MB
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          onClick={onRemove}
        >
          <Cross2Icon className="size-4 " aria-hidden="true" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    </div>
  )
}
"use client";

import { Skeleton } from "@midday/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@midday/ui/table";

export function DataTableSkeleton() {
  return (
    <div className="w-full">
      <div className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide">
        <Table>
          <TableBody className="border-l-0 border-r-0">
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index} className="h-[45px]">
                <TableCell className="w-[160px]">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </TableCell>
                <TableCell className="w-[140px]">
                  <Skeleton className="h-6 w-24" />
                </TableCell>
                <TableCell className="w-[180px]">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </TableCell>
                <TableCell className="w-[180px]">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="w-[150px]">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="w-[50px]">
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

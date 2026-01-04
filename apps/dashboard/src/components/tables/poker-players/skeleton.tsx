"use client";

import { cn } from "@midday/ui/cn";
import { Skeleton } from "@midday/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@midday/ui/table";

const data = [...Array(10)].map((_, i) => ({ id: i.toString() }));

export function DataTableSkeleton() {
  return (
    <div className="w-full">
      <div className="overflow-x-auto md:border-l md:border-r border-border">
        <Table>
          {/* Header Skeleton */}
          <thead className="border-l-0 border-r-0">
            <TableRow>
              <TableCell className="w-[240px] min-w-[240px] md:sticky md:left-0 bg-background z-20">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="w-[120px]">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="w-[100px]">
                <Skeleton className="h-4 w-14" />
              </TableCell>
              <TableCell className="w-[150px]">
                <Skeleton className="h-4 w-14" />
              </TableCell>
              <TableCell className="w-[120px] text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell className="w-[120px] text-right">
                <Skeleton className="h-4 w-14 ml-auto" />
              </TableCell>
              <TableCell className="w-[120px] text-right">
                <Skeleton className="h-4 w-20 ml-auto" />
              </TableCell>
              <TableCell className="w-[200px]">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="w-[50px] md:sticky md:right-0 bg-background z-30" />
            </TableRow>
          </thead>

          <TableBody className="border-l-0 border-r-0 border-t-0 border-b-0">
            {data.map((row) => (
              <TableRow key={row.id} className="h-[45px]">
                {/* Player column */}
                <TableCell className="w-[240px] min-w-[240px] md:sticky md:left-0 bg-background z-20">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </TableCell>
                {/* PPPoker ID column */}
                <TableCell className="w-[120px]">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                {/* Status column */}
                <TableCell className="w-[100px]">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                {/* Agent column */}
                <TableCell className="w-[150px]">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                {/* Balance column */}
                <TableCell className="w-[120px] text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                {/* Chips column */}
                <TableCell className="w-[120px] text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                {/* Credit Limit column */}
                <TableCell className="w-[120px] text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                {/* Contact column */}
                <TableCell className="w-[200px]">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </TableCell>
                {/* Actions column */}
                <TableCell
                  className={cn(
                    "w-[50px] md:sticky md:right-0 bg-background z-30",
                  )}
                >
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

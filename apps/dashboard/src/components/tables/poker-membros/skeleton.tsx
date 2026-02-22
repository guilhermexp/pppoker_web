"use client";

import { Skeleton } from "@midpoker/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@midpoker/ui/table";

const data = [...Array(10)].map((_, i) => ({ id: i.toString() }));

export function DataTableSkeleton() {
  return (
    <div className="w-full">
      <div className="overflow-x-auto md:border-l md:border-r border-border">
        <Table>
          <thead className="border-l-0 border-r-0">
            <TableRow>
              <TableCell className="w-[240px] min-w-[240px] md:sticky md:left-0 bg-background z-20">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="w-[120px]">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="w-[120px]">
                <Skeleton className="h-4 w-14" />
              </TableCell>
              <TableCell className="w-[150px]">
                <Skeleton className="h-4 w-14" />
              </TableCell>
              <TableCell className="w-[120px]">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="w-[120px] text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell className="w-[120px] text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell className="w-[100px]">
                <Skeleton className="h-4 w-14" />
              </TableCell>
            </TableRow>
          </thead>

          <TableBody className="border-l-0 border-r-0 border-t-0 border-b-0">
            {data.map((row) => (
              <TableRow key={row.id} className="h-[45px]">
                <TableCell className="w-[240px] min-w-[240px] md:sticky md:left-0 bg-background z-20">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell className="w-[150px]">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="w-[120px] text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="w-[120px] text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="w-[100px]">
                  <Skeleton className="h-5 w-14 rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

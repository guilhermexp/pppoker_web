"use client";

import { Skeleton } from "@midday/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midday/ui/table";

export function DataTableSkeleton() {
  return (
    <div className="w-full">
      <div className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide">
        <Table>
          <TableHeader className="border-l-0 border-r-0">
            <TableRow>
              <TableHead className="w-[240px]">Agent</TableHead>
              <TableHead className="w-[120px]">PPPoker ID</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Rakeback %</TableHead>
              <TableHead className="w-[150px]">Super Agent</TableHead>
              <TableHead className="w-[120px]">Balance</TableHead>
              <TableHead className="w-[200px]">Contact</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody className="border-l-0 border-r-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i} className="h-[57px]">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
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

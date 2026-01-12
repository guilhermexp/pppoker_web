"use client";

import {
  useAddLinkedClubMutation,
  useLinkedClubsQuery,
  useRemoveLinkedClubMutation,
} from "@/hooks/use-team";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@midpoker/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@midpoker/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@midpoker/ui/form";
import { Input } from "@midpoker/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod/v3";

const addClubSchema = z.object({
  clubId: z.string().min(1, "ID do clube é obrigatório"),
  clubName: z.string().optional(),
});

export function PokerLinkedClubs() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data } = useLinkedClubsQuery();
  const addMutation = useAddLinkedClubMutation();
  const removeMutation = useRemoveLinkedClubMutation();

  const form = useZodForm(addClubSchema, {
    defaultValues: {
      clubId: "",
      clubName: "",
    },
  });

  const onSubmit = form.handleSubmit((formData) => {
    addMutation.mutate(
      {
        clubId: formData.clubId,
        clubName: formData.clubName || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setIsDialogOpen(false);
        },
      },
    );
  });

  const handleRemove = (clubId: string) => {
    removeMutation.mutate({ clubId });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Clubes Vinculados</CardTitle>
          <CardDescription>
            Gerencie os clubes que fazem parte da sua liga
          </CardDescription>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Clube
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Clube</DialogTitle>
              <DialogDescription>
                Adicione um clube à sua liga informando o ID do clube na
                plataforma
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clubId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID do Clube</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: 123456" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clubName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Clube (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Clube Alpha" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {data?.clubs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum clube vinculado. Adicione clubes que fazem parte da sua liga.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Conta no Sistema</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell className="font-mono">{club.clubId}</TableCell>
                  <TableCell>{club.clubName || "-"}</TableCell>
                  <TableCell>
                    {club.linkedTeamName ? (
                      <span className="text-green-600 dark:text-green-400">
                        {club.linkedTeamName} ✓
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(club.clubId)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && data.total > 0 && (
          <div className="text-sm text-muted-foreground mt-4">
            Total: {data.total} clube{data.total !== 1 ? "s" : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

export function moveCollectionItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(index, 1);
  if (item !== undefined) next.splice(nextIndex, 0, item);
  return next;
}

export function CollectionItemControls({
  index,
  count,
  onMove,
  onDelete,
}: {
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Mover arriba"
        title="Mover arriba"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className="min-h-9 min-w-9 rounded-lg p-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Mover abajo"
        title="Mover abajo"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        className="min-h-9 min-w-9 rounded-lg p-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Eliminar elemento"
        title="Eliminar"
        onClick={onDelete}
        className="min-h-9 min-w-9 rounded-lg p-2 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

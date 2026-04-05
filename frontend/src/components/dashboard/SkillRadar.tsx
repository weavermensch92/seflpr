import { Badge } from "@/components/ui/badge";
import type { TagCount } from "@/api/profiles";

interface Props {
  tags: TagCount[];
}

export default function SkillRadar({ tags }: Props) {
  if (tags.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        태그가 등록된 경험이 없습니다
      </div>
    );
  }

  const maxCount = Math.max(...tags.map((t) => t.count));

  return (
    <div className="space-y-2">
      {tags.map((tag) => (
        <div key={tag.tag} className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs shrink-0 w-24 justify-center truncate">
            {tag.tag}
          </Badge>
          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/70 rounded-full transition-all duration-500"
              style={{ width: `${(tag.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-6 text-right">{tag.count}</span>
        </div>
      ))}
    </div>
  );
}

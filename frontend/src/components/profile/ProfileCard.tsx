import { Pencil, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LocalProfileItem } from "@/stores/localProfileStore";
import type { ProfileLike } from "./ProfileFormModal";

interface Props {
  profile: ProfileLike;
  onEdit: (p: ProfileLike) => void;
  onDelete: (id: string) => void;
}

export default function ProfileCard({ profile, onEdit, onDelete }: Props) {
  const dateRange = [profile.start_date, profile.end_date]
    .filter(Boolean)
    .map((d) => d!.slice(0, 7))
    .join(" ~ ");

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{profile.title}</p>
          {(profile.organization || profile.role) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[profile.organization, profile.role].filter(Boolean).join(" · ")}
            </p>
          )}
          {dateRange && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar size={11} />
              {dateRange}
            </p>
          )}
          {profile.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {profile.description}
            </p>
          )}
          {profile.tags && profile.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {profile.tags.slice(0, 5).map((t) => (
                <Badge key={t} variant="muted" className="text-xs px-1.5 py-0">
                  {t}
                </Badge>
              ))}
              {profile.tags.length > 5 && (
                <Badge variant="muted" className="text-xs px-1.5 py-0">
                  +{profile.tags.length - 5}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(profile)}>
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete('id' in profile ? profile.id : (profile as LocalProfileItem).tempId)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}

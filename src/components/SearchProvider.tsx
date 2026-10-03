import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { FileText, FolderGit2, PlayCircle, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toneForCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SearchContextValue {
  openSearch: () => void;
}

const SearchContext = createContext<SearchContextValue>({
  openSearch: () => {},
});

export function useSearch() {
  return useContext(SearchContext);
}

const PAGES = [
  { path: "/", label: "Home" },
  { path: "/content", label: "Content library" },
  { path: "/articles", label: "Articles" },
  { path: "/projects", label: "Projects" },
  { path: "/about", label: "About" },
  { path: "/community", label: "Community" },
  { path: "/contact", label: "Contact" },
];

/**
 * Global command palette (Ctrl/⌘ + K) searching videos, articles, projects
 * and pages in one place. Provided app-wide so any component can open it.
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const posts = useQuery(api.posts.listLatestPosts);
  const articles = useQuery(api.articles.listArticles, { page: 1 });
  const projects = useQuery(api.projects.listProjects, { page: 1 });

  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const loading = posts === undefined || articles === undefined || projects === undefined;
  const videoItems = posts ?? [];
  const articleItems = articles?.items ?? [];
  const projectItems = projects?.items ?? [];

  const value = useMemo(() => ({ openSearch }), [openSearch]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search across videos, articles, projects and pages"
        className="top-[18%] translate-y-0 sm:top-[20%]"
      >
        <CommandInput placeholder="Search videos, articles, projects…" />
        <CommandList>
          {loading && (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Searching…
            </div>
          )}
          {!loading && <CommandEmpty>No results found for your search.</CommandEmpty>}

          {videoItems.length > 0 && (
            <CommandGroup heading="Videos">
              {videoItems.map((post) => (
                <CommandItem
                  key={post._id}
                  value={`video ${post.title} ${post.categories.join(" ")} ${post.tags.join(" ")}`}
                  onSelect={() => go(`/content/${post._id}`)}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md border",
                      toneForCategory(post.categories[0]),
                    )}
                  >
                    <PlayCircle className="size-4" />
                  </span>
                  <span className="truncate">{post.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {post.categories[0] ?? "Video"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {articleItems.length > 0 && (
            <CommandGroup heading="Articles">
              {articleItems.map((article) => (
                <CommandItem
                  key={article._id}
                  value={`article ${article.title} ${article.category} ${article.tags.join(" ")}`}
                  onSelect={() => go(`/articles/${article.slug}`)}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md border",
                      toneForCategory(article.category),
                    )}
                  >
                    <FileText className="size-4" />
                  </span>
                  <span className="truncate">{article.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {article.category}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {projectItems.length > 0 && (
            <CommandGroup heading="Projects">
              {projectItems.map((project) => (
                <CommandItem
                  key={project._id}
                  value={`project ${project.name} ${project.category} ${project.technologies.join(" ")}`}
                  onSelect={() => go(`/projects/${project._id}`)}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-sage/30 bg-sage/15 text-sage">
                    <FolderGit2 className="size-4" />
                  </span>
                  <span className="truncate">{project.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {project.status ?? "Project"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Pages">
            {PAGES.map((page) => (
              <CommandItem
                key={page.path}
                value={`page ${page.label}`}
                onSelect={() => go(page.path)}
              >
                <Sparkles className="size-4 text-gold" />
                <span className="truncate">{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SearchContext.Provider>
  );
}

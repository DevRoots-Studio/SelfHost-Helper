import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Settings,
  Home,
  Folder as FolderIcon,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Users,
  GripVertical,
  FolderPlus,
  FolderOpen,
  ChevronDown,
  Trash2,
  Edit2,
  Download,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { useAtom, useSetAtom } from "jotai";
import {
  projectsAtom,
  categoriesAtom,
  isAddProjectModalOpenAtom,
  isProjectSettingsOpenAtom,
  windowButtonsSideAtom,
} from "@/store/atoms";
import AddProjectDialog from "./AddProjectDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

const API = window.api;

const Sidebar = React.memo(({ onProjectsChange }) => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const activeProjectId = projectId != null ? Number(projectId) : null;
  const [projects, setProjects] = useAtom(projectsAtom);
  const [windowButtonsSide] = useAtom(windowButtonsSideAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const saved = localStorage.getItem("collapsedCategories");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((id) => {
          const parsedId = Number(id);
          return Number.isFinite(parsedId) ? parsedId : null;
        })
        .filter((id) => id !== null);
    } catch {
      return [];
    }
  });
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editProjectName, setEditProjectName] = useState("");
  const setIsAddOpen = useSetAtom(isAddProjectModalOpenAtom);
  const setIsProjectSettingsOpen = useSetAtom(isProjectSettingsOpenAtom);

  useEffect(() => {
    localStorage.setItem("collapsedCategories", JSON.stringify(collapsedCategories));
  }, [collapsedCategories]);

  const toNullableNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizeOrder = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseDraggableMeta = (draggableId) => {
    if (draggableId.startsWith("project-")) {
      return {
        kind: "project",
        id: toNullableNumber(draggableId.replace("project-", "")),
      };
    }
    if (draggableId.startsWith("category-")) {
      return {
        kind: "category",
        id: toNullableNumber(draggableId.replace("category-", "")),
      };
    }
    return null;
  };

  const parseCategoryDroppableId = (droppableId) => {
    if (droppableId === "sidebar-content") return null;
    if (!droppableId?.startsWith("cat-")) return undefined;
    return toNullableNumber(droppableId.replace("cat-", ""));
  };

  const isInCategory = (project, categoryId) => toNullableNumber(project.categoryId) === categoryId;

  const getSortedProjectsInCategory = (categoryId, projectList = projects) =>
    projectList
      .filter((project) => isInCategory(project, categoryId))
      .sort((a, b) => normalizeOrder(a.order) - normalizeOrder(b.order));

  const buildProjectReorderUpdates = (projectList, categoryId) =>
    projectList
      .map((project, index) => ({
        id: toNullableNumber(project.id),
        order: index,
        categoryId,
      }))
      .filter((update) => update.id !== null);

  const toggleCategory = (id) => {
    const normalizedId = toNullableNumber(id);
    if (normalizedId === null) return;
    setCollapsedCategories((prev) =>
      prev.includes(normalizedId) ? prev.filter((i) => i !== normalizedId) : [...prev, normalizedId]
    );
  };

  const moveProjectToCategory = async ({
    projectId,
    destinationCategoryId,
    destinationIndex,
    sourceDroppableId,
    destinationDroppableId,
  }) => {
    const sourceCategoryId = parseCategoryDroppableId(sourceDroppableId);
    if (sourceCategoryId === undefined) return;

    const movedProject = projects.find((project) => toNullableNumber(project.id) === projectId);
    if (!movedProject) return;

    const isSameCategory = sourceCategoryId === destinationCategoryId;

    const sourceWithoutMoved = getSortedProjectsInCategory(sourceCategoryId)
      .filter((project) => toNullableNumber(project.id) !== projectId)
      .map((project) => ({ ...project }));

    const destinationWithoutMoved = (
      isSameCategory
        ? sourceWithoutMoved
        : getSortedProjectsInCategory(destinationCategoryId).filter(
            (project) => toNullableNumber(project.id) !== projectId
          )
    ).map((project) => ({ ...project }));

    const insertAt =
      destinationIndex === null || destinationIndex === undefined
        ? destinationWithoutMoved.length
        : Math.max(0, Math.min(destinationIndex, destinationWithoutMoved.length));

    destinationWithoutMoved.splice(insertAt, 0, {
      ...movedProject,
      categoryId: destinationCategoryId,
    });

    const finalDestinationProjects = destinationWithoutMoved;
    const finalSourceProjects = isSameCategory ? finalDestinationProjects : sourceWithoutMoved;

    const updatedProjects = projects.map((project) => {
      const currentId = toNullableNumber(project.id);
      if (currentId === null) return project;

      if (currentId === projectId) {
        return {
          ...project,
          categoryId: destinationCategoryId,
          order: insertAt,
        };
      }

      const destinationOrder = finalDestinationProjects.findIndex(
        (item) => toNullableNumber(item.id) === currentId
      );
      if (destinationOrder !== -1) {
        return {
          ...project,
          categoryId: destinationCategoryId,
          order: destinationOrder,
        };
      }

      if (!isSameCategory) {
        const sourceOrder = finalSourceProjects.findIndex(
          (item) => toNullableNumber(item.id) === currentId
        );
        if (sourceOrder !== -1) {
          return {
            ...project,
            categoryId: sourceCategoryId,
            order: sourceOrder,
          };
        }
      }

      return project;
    });

    setProjects(updatedProjects);

    try {
      const updates = [
        ...buildProjectReorderUpdates(finalDestinationProjects, destinationCategoryId),
        ...(isSameCategory
          ? []
          : buildProjectReorderUpdates(finalSourceProjects, sourceCategoryId)),
      ];

      await API.reorderProjectsBulk({ updates });

      if (sourceDroppableId !== destinationDroppableId) {
        onProjectsChange();
      }
    } catch (error) {
      toast.error("Failed to move project");
      onProjectsChange();
    }
  };

  const reorderRootLevel = async ({ draggableKind, draggableId, destinationIndex }) => {
    const combined = [
      ...categories.map((category) => ({
        ...category,
        normalizedId: toNullableNumber(category.id),
        isCategory: true,
      })),
      ...projects
        .filter((project) => toNullableNumber(project.categoryId) === null)
        .map((project) => ({
          ...project,
          normalizedId: toNullableNumber(project.id),
          isProject: true,
        })),
    ]
      .filter((item) => item.normalizedId !== null)
      .sort((a, b) => normalizeOrder(a.order) - normalizeOrder(b.order));

    const sourceIndexInCombined = combined.findIndex((item) => {
      if (draggableKind === "project") {
        return item.isProject && item.normalizedId === draggableId;
      }
      return item.isCategory && item.normalizedId === draggableId;
    });

    let moved;
    if (sourceIndexInCombined !== -1) {
      [moved] = combined.splice(sourceIndexInCombined, 1);
    } else if (draggableKind === "project") {
      const project = projects.find((item) => toNullableNumber(item.id) === draggableId);
      if (!project) return;
      moved = {
        ...project,
        normalizedId: toNullableNumber(project.id),
        isProject: true,
        categoryId: null,
      };
    } else {
      return;
    }

    const movedProjectSourceCategoryId =
      draggableKind === "project" ? toNullableNumber(moved.categoryId) : null;

    const insertAt = Math.max(0, Math.min(destinationIndex, combined.length));
    combined.splice(insertAt, 0, moved);

    const newOrders = combined.map((item, index) => ({
      id: item.normalizedId,
      order: index,
      isProject: item.isProject,
    }));

    const sourceCategoryProjectsWithoutMoved =
      movedProjectSourceCategoryId !== null
        ? getSortedProjectsInCategory(movedProjectSourceCategoryId).filter(
            (project) => toNullableNumber(project.id) !== draggableId
          )
        : [];

    const updatedProjects = projects.map((project) => {
      const currentId = toNullableNumber(project.id);
      if (currentId === null) return project;

      const orderInfo = newOrders.find((item) => item.isProject && item.id === currentId);

      if (draggableKind === "project" && currentId === draggableId) {
        return {
          ...project,
          categoryId: null,
          order: orderInfo?.order ?? project.order,
        };
      }

      if (movedProjectSourceCategoryId !== null) {
        const sourceOrder = sourceCategoryProjectsWithoutMoved.findIndex(
          (item) => toNullableNumber(item.id) === currentId
        );
        if (sourceOrder !== -1) {
          return {
            ...project,
            categoryId: movedProjectSourceCategoryId,
            order: sourceOrder,
          };
        }
      }

      if (orderInfo) return { ...project, order: orderInfo.order };
      return project;
    });

    const updatedCategories = categories.map((category) => {
      const currentId = toNullableNumber(category.id);
      if (currentId === null) return category;
      const orderInfo = newOrders.find((item) => !item.isProject && item.id === currentId);
      if (orderInfo) return { ...category, order: orderInfo.order };
      return category;
    });

    setProjects(updatedProjects);
    setCategories(updatedCategories);

    try {
      const projectOrders = newOrders
        .filter((item) => item.isProject)
        .map((item) => ({ id: item.id, order: item.order }));
      const categoryOrders = newOrders
        .filter((item) => !item.isProject)
        .map((item) => ({ id: item.id, order: item.order }));

      if (draggableKind === "project") {
        const updates = [
          ...projectOrders.map((project) => ({
            id: project.id,
            order: project.order,
            categoryId: null,
          })),
          ...(movedProjectSourceCategoryId !== null
            ? buildProjectReorderUpdates(
                sourceCategoryProjectsWithoutMoved,
                movedProjectSourceCategoryId
              )
            : []),
        ];
        await API.reorderProjectsBulk({ updates });
      } else {
        await API.reorderProjects({ orders: projectOrders });
      }

      if (categoryOrders.length > 0) {
        await API.reorderCategories(categoryOrders);
      }
    } catch (error) {
      toast.error("Failed to reorder items");
      onProjectsChange();
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, combine } = result;
    const draggableMeta = parseDraggableMeta(draggableId);
    if (!draggableMeta || draggableMeta.id === null) return;

    // Header drop via combine mode: drop project on category card.
    if (combine) {
      const combineMeta = parseDraggableMeta(combine.draggableId);
      if (
        draggableMeta.kind === "project" &&
        combineMeta?.kind === "category" &&
        combineMeta.id !== null
      ) {
        await moveProjectToCategory({
          projectId: draggableMeta.id,
          destinationCategoryId: combineMeta.id,
          destinationIndex: null,
          sourceDroppableId: source.droppableId,
          destinationDroppableId: `cat-${combineMeta.id}`,
        });
        return;
      }
    }

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    if (destination.droppableId === "sidebar-content") {
      await reorderRootLevel({
        draggableKind: draggableMeta.kind,
        draggableId: draggableMeta.id,
        destinationIndex: destination.index,
      });
      return;
    }

    if (draggableMeta.kind === "project") {
      const destinationCategoryId = parseCategoryDroppableId(destination.droppableId);
      if (destinationCategoryId === undefined) return;

      await moveProjectToCategory({
        projectId: draggableMeta.id,
        destinationCategoryId,
        destinationIndex: destination.index,
        sourceDroppableId: source.droppableId,
        destinationDroppableId: destination.droppableId,
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await API.addCategory({
        name: newCategoryName.trim(),
        order:
          categories.length +
          projects.filter((p) => toNullableNumber(p.categoryId) === null).length,
      });
      setNewCategoryName("");
      setIsAddingCategory(false);
      onProjectsChange();
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (confirm("Are you sure? Projects will be moved to Uncategorized.")) {
      try {
        await API.deleteCategory(id);
        onProjectsChange();
      } catch (error) {
        toast.error("Failed to delete category");
      }
    }
  };

  const handleUpdateCategory = async (id) => {
    if (!editCategoryName.trim()) return;
    try {
      await API.updateCategory({ id, name: editCategoryName.trim() });
      setEditingCategoryId(null);
      setEditCategoryName("");
      onProjectsChange();
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleUpdateProject = async (id) => {
    if (!editProjectName.trim()) return;
    try {
      await API.updateProject({ id, name: editProjectName.trim() });
      setEditingProjectId(null);
      setEditProjectName("");
      onProjectsChange();
    } catch (error) {
      toast.error("Failed to rename project");
    }
  };

  const handleDeleteProject = async (id) => {
    if (confirm("Are you sure? This will remove the project from SelfHost Helper.")) {
      try {
        await API.deleteProject(id);
        onProjectsChange();
      } catch (error) {
        toast.error("Failed to delete project");
      }
    }
  };

  const openInExplorer = (e, path) => {
    if (e) e.stopPropagation();
    API.openPath(path);
  };

  const CATEGORY_COLOR_PALETTE = [
    "bg-primary/25",
    "bg-blue-500/25",
    "bg-emerald-500/25",
    "bg-amber-500/25",
    "bg-violet-500/25",
    "bg-rose-500/25",
    "bg-cyan-500/25",
    "bg-orange-500/25",
  ];
  const getCategoryColor = (categoryId) => {
    const id = toNullableNumber(categoryId);
    if (id == null) return CATEGORY_COLOR_PALETTE[0];
    const index = Math.abs(id) % CATEGORY_COLOR_PALETTE.length;
    return CATEGORY_COLOR_PALETTE[index];
  };

  const [width, setWidth] = useState(72);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isOverlayMode, setIsOverlayMode] = useState(
    typeof window !== "undefined" && window.innerWidth <= 900
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isRtl, setIsRtl] = useState(
    () =>
      typeof document !== "undefined" &&
      (document.documentElement.getAttribute("dir") === "rtl" ||
        getComputedStyle(document.documentElement).direction === "rtl")
  );

  useEffect(() => {
    const el = document.documentElement;
    const updateRtl = () => {
      setIsRtl(el.getAttribute("dir") === "rtl" || getComputedStyle(el).direction === "rtl");
    };
    const observer = new MutationObserver(updateRtl);
    observer.observe(el, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);
  const [discordInfo, setDiscordInfo] = useState(null);
  const [updateStatus, setUpdateStatus] = useState("idle");
  const [updateVersion, setUpdateVersion] = useState("");

  const DISCORD_INVITE_CODE = "C62mj58Q2D";

  useEffect(() => {
    const sync = async () => {
      try {
        const s = await API.getUpdateStatus?.();
        if (s?.status) setUpdateStatus(s.status);
        if (s?.version != null) setUpdateVersion(s.version ?? "");
      } catch (_) {}
    };
    sync();
    const unsub = API.onUpdaterStatus?.((payload) => {
      if (payload?.status) setUpdateStatus(payload.status);
      if (payload?.version != null) setUpdateVersion(payload.version ?? "");
    });
    return () => (typeof unsub === "function" ? unsub() : undefined);
  }, []);

  useEffect(() => {
    fetchDiscordInfo();
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth && !isOverlayMode) {
      const w = parseInt(savedWidth);
      setWidth(w);
      setIsCollapsed(w < 120);
    } else if (isOverlayMode) {
      setWidth(72);
      setIsCollapsed(true);
      setIsOverlayOpen(false);
    }
  }, [isOverlayMode]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 72) newWidth = 72;
      if (newWidth > 400) newWidth = 400;
      setWidth(newWidth);
      setIsCollapsed(newWidth < 120);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (!isOverlayMode) {
        localStorage.setItem("sidebarWidth", width);
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, width, isOverlayMode]);

  useEffect(() => {
    const handleResize = () => {
      const isNarrow = window.innerWidth <= 900;
      setIsOverlayMode(isNarrow);
      if (isNarrow) {
        setIsCollapsed(true);
        setIsOverlayOpen(false);
        setWidth(72);
      } else {
        const savedWidth = localStorage.getItem("sidebarWidth");
        if (savedWidth) setWidth(parseInt(savedWidth));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isOverlayMode) {
      if (!isOverlayOpen) {
        setWidth(280);
        setIsCollapsed(false);
        setIsOverlayOpen(true);
      } else {
        setWidth(72);
        setIsCollapsed(true);
        setIsOverlayOpen(false);
      }
      return;
    }

    if (width < 120) {
      setWidth(280);
      setIsCollapsed(false);
    } else {
      setWidth(72);
      setIsCollapsed(true);
    }
  };

  const fetchDiscordInfo = async () => {
    try {
      const result = await API.getDiscordInfo(DISCORD_INVITE_CODE);
      if (result.success) {
        setDiscordInfo(result.data);
      }
    } catch (error) {
      console.error("IPC error:", error);
    }
  };

  const getDiscordAvatarUrl = () => {
    if (!discordInfo?.guild?.icon) return null;
    return `https://cdn.discordapp.com/icons/${discordInfo.guild.id}/${discordInfo.guild.icon}.png?size=256`;
  };

  const getDiscordBannerUrl = () => {
    if (!discordInfo?.guild?.banner) return null;
    return `https://cdn.discordapp.com/banners/${discordInfo.guild.id}/${discordInfo.guild.banner}.png?size=1024`;
  };

  const renderProject = (p, index) => {
    const isSelected = activeProjectId === p.id;
    return (
      <Draggable key={`project-${p.id}`} draggableId={`project-${p.id}`} index={index}>
        {(provided, snapshot) => {
          const draggableStyle = {
            ...provided.draggableProps.style,
            ...(snapshot.isDragging ? { zIndex: 10000 } : {}),
          };

          const projectNode = (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={draggableStyle}
              className="outline-none"
            >
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div
                    onClick={() => navigate(`/project/${p.id}/overview`)}
                    className={cn(
                      "sidebar-item group relative transition-all duration-200 select-none",
                      width < 120 ? "collapsed" : "",
                      width < 120 && toNullableNumber(p.categoryId) === null && !isSelected
                        ? "border-white/5"
                        : "",
                      isSelected ? "active" : "hover:bg-white/5",
                      width < 120 ? "mx-auto" : "px-3 py-2.5",
                      snapshot.isDragging &&
                        "opacity-95 ring-2 ring-primary bg-primary/20 shadow-2xl"
                    )}
                    title={width < 120 ? p.name : undefined}
                  >
                    {width >= 120 && (
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity p-1">
                        <GripVertical className="h-3 w-3" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "relative shrink-0 flex items-center justify-center transition-all duration-300",
                        width < 120 ? "w-10 h-10" : "w-10 h-10"
                      )}
                    >
                      {p.icon ? (
                        <div
                          className={cn(
                            "rounded-lg overflow-hidden flex items-center justify-center transition-all duration-300",
                            width < 120 ? "w-10 h-10 rounded-xl" : "w-8 h-8 rounded-md"
                          )}
                        >
                          <img
                            src={
                              p.icon.match(/^(https?:\/\/|data:)/)
                                ? p.icon
                                : `media:///${p.icon.replace(/\\/g, "/")}?t=${
                                    new Date(p.updatedAt).getTime() || Date.now()
                                  }`
                            }
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "flex items-center justify-center font-bold text-lg bg-white/5 rounded-lg transition-all",
                            width < 120 ? "w-10 h-10 rounded-xl" : "w-8 h-8"
                          )}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {width >= 120 && (
                      <div className="flex flex-col min-w-0 flex-1 ml-3 transition-all duration-300 origin-left">
                        <div className="flex items-center gap-2">
                          {editingProjectId === p.id ? (
                            <input
                              autoFocus
                              className="bg-transparent border-none outline-none text-sm font-medium flex-1 text-primary min-w-0"
                              value={editProjectName}
                              onChange={(e) => setEditProjectName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateProject(p.id);
                                if (e.key === "Escape") setEditingProjectId(null);
                              }}
                              onBlur={() => setEditingProjectId(null)}
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="font-medium truncate text-sm flex-1">{p.name}</span>
                          )}
                        </div>
                        <span className="text-xs opacity-50 truncate text-muted-foreground">
                          {p.path}
                        </span>
                      </div>
                    )}

                    <div
                      className={cn(
                        "absolute transition-all duration-300 flex items-center justify-center",
                        width < 120
                          ? "top-0 right-0 -translate-y-1/4 translate-x-1/4"
                          : "relative right-auto top-auto ml-auto transform-none"
                      )}
                    >
                      {p.status === "running" && (
                        <div className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        </div>
                      )}
                      {p.status === "error" && <div className="h-2 w-2 rounded-full bg-red-500" />}
                      {(!p.status || p.status === "stopped") && width >= 120 && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                      )}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => {
                      navigate(`/project/${p.id}/overview`);
                      setIsProjectSettingsOpen(true);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      setEditingProjectId(p.id);
                      setEditProjectName(p.name);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Rename
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => openInExplorer(null, p.path)}>
                    <FolderOpen className="w-4 h-4 mr-2" /> Open Folder
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteProject(p.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Server
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          );

          if (snapshot.isDragging && typeof document !== "undefined") {
            return createPortal(projectNode, document.body);
          }

          return projectNode;
        }}
      </Draggable>
    );
  };

  return (
    <>
      {isOverlayMode && isOverlayOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => {
            setWidth(72);
            setIsCollapsed(true);
            setIsOverlayOpen(false);
          }}
        />
      )}

      <motion.aside
        className={cn(
          "bg-transparent border-r border-white/5 flex flex-col backdrop-blur-xl relative overflow-hidden group/sidebar",
          isOverlayMode && isOverlayOpen
            ? "fixed inset-y-0 left-0 z-50 shadow-xl bg-background/90"
            : ""
        )}
        initial={false}
        animate={{ width: width }}
        transition={{
          type: "tween",
          duration: 0.1,
        }}
      >
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        />
        {windowButtonsSide === "left" && (
          <div className="h-9 shrink-0 no-drag" aria-hidden="true" />
        )}
        <div
          className={cn(
            "flex items-center shrink-0 drag h-16 transition-all duration-300",
            width < 120 ? "justify-center px-0" : "justify-between px-4",
            isRtl && "pl-[140px]"
          )}
        >
          {width < 120 ? (
            <button
              type="button"
              onClick={() => toggleSidebar()}
              className="no-drag w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <img
                src="media://app/resources/icon.png"
                alt="SelfHost Helper"
                className="w-8 h-8 rounded-lg object-cover"
                draggable={false}
              />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                <img
                  src="media://app/resources/icon.png"
                  alt="SelfHost Helper"
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                  draggable={false}
                />
                <AnimatePresence>
                  <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-bold text-lg tracking-tight"
                  >
                    SelfHost
                  </motion.h1>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-1 shrink-0 no-drag">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleSidebar()}
                  className="w-8 h-8 p-0 hover:bg-primary/20 hover:text-primary cursor-pointer flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          <AddProjectDialog onProjectsChange={onProjectsChange} />
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  "flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar",
                  isCollapsed ? "space-y-3" : "space-y-5"
                )}
              >
                {isAddingCategory && !isCollapsed && (
                  <div
                    className="relative z-10 px-2 py-1 bg-white/5 rounded-lg flex items-center gap-2 border border-primary/20"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      className="bg-transparent border-none outline-none text-sm flex-1 pl-1 min-w-0"
                      placeholder="Category Name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCategory();
                        if (e.key === "Escape") setIsAddingCategory(false);
                      }}
                      onBlur={() => {
                        setTimeout(() => setIsAddingCategory(false), 200);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6 hov-primary"
                      onClick={handleAddCategory}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Home Navigation Button */}
                <button
                  onClick={() => navigate("/")}
                  className={cn(
                    "w-full px-3 py-3 rounded-lg border transition-all duration-300 flex items-center gap-3 text-sm font-medium cursor-pointer group/home",
                    activeProjectId === null
                      ? "bg-primary/20 border-primary/30 text-primary"
                      : "border-white/5 hover:border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isCollapsed ? (
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg border transition-all duration-300",
                      activeProjectId === null
                        ? "bg-primary/25 border-primary/30"
                        : "border-white/10 hover:bg-white/5"
                    )}>
                      <Home className="h-5 w-5" />
                    </div>
                  ) : (
                    <>
                      <Home className="h-5 w-5 shrink-0" />
                      <span className="flex-1 truncate">Home</span>
                      {activeProjectId === null && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </>
                  )}
                </button>

                <Droppable droppableId="sidebar-content" type="project" isCombineEnabled>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        isCollapsed ? "space-y-3" : "space-y-5",
                        "min-h-full pb-20 transition-all"
                      )}
                    >
                      {[
                        ...categories.map((c) => ({ ...c, isCategory: true })),
                        ...projects
                          .filter((p) => toNullableNumber(p.categoryId) === null)
                          .map((p) => ({ ...p, isProject: true })),
                      ]
                        .sort((a, b) => normalizeOrder(a.order) - normalizeOrder(b.order))
                        .map((item, index) => {
                          if (item.isProject) {
                            return renderProject(item, index);
                          }

                          const category = item;
                          const categoryId = toNullableNumber(category.id);
                          if (categoryId === null) return null;
                          const categoryProjects = getSortedProjectsInCategory(categoryId);
                          const isCategoryCollapsed = collapsedCategories.includes(categoryId);
                          return (
                            <Draggable
                              key={`category-${categoryId}`}
                              draggableId={`category-${categoryId}`}
                              index={index}
                            >
                              {(providedCat, snapshotCat) => (
                                <div
                                  ref={providedCat.innerRef}
                                  {...providedCat.draggableProps}
                                  className="outline-none"
                                >
                                  <ContextMenu>
                                    <ContextMenuTrigger asChild>
                                      <div
                                        className={cn(
                                          "transition-all duration-300",
                                          isCollapsed
                                            ? cn(
                                                "mx-auto rounded-xl overflow-hidden transition-all duration-300",
                                                categoryProjects.length === 0 ? "w-14" : "w-12",
                                                isCategoryCollapsed
                                                  ? "hover:bg-white/5 border-2 border-white/5"
                                                  : "bg-primary/[0.07] shadow-lg ring-1 ring-white/10"
                                              )
                                            : cn(
                                                "rounded-xl border transition-all duration-500",
                                                isCategoryCollapsed
                                                  ? cn(
                                                      "bg-primary/[0.07] border-white/5 hover:bg-white/6 hover:border-white/10 hover:shadow-lg",
                                                      categoryProjects.length === 0 && "min-h-17"
                                                    )
                                                  : "bg-primary/[0.07] border-primary/20 p-1.5 shadow-2xl shadow-black/40"
                                              ),
                                          snapshotCat.isDragging && "opacity-80 scale-95"
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            "flex items-center justify-between group/cat",
                                            !isCollapsed &&
                                              (isCategoryCollapsed && categoryProjects.length === 0
                                                ? "px-2 py-2.5"
                                                : "px-2 py-1.5")
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              "flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none",
                                              isCollapsed ? "w-12 h-12 justify-center" : ""
                                            )}
                                            onClick={() =>
                                              editingCategoryId !== categoryId &&
                                              toggleCategory(categoryId)
                                            }
                                            {...(editingCategoryId !== categoryId
                                              ? providedCat.dragHandleProps
                                              : {})}
                                          >
                                            {isCollapsed ? (
                                              <div
                                                className={cn(
                                                  "rounded-lg border border-white/10 overflow-hidden flex items-center justify-center shrink-0 w-10 h-10",
                                                  getCategoryColor(categoryId)
                                                )}
                                              >
                                                <FolderIcon className="w-5 h-5 text-muted-foreground/40" />
                                              </div>
                                            ) : (
                                              <>
                                                <div className="opacity-0 group-hover/cat:opacity-30 transition-opacity p-1 -ml-1">
                                                  <GripVertical className="h-3 w-3" />
                                                </div>
                                                <ChevronDown
                                                  className={cn(
                                                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                                    isCategoryCollapsed && "-rotate-90"
                                                  )}
                                                />
                                                {editingCategoryId === categoryId ? (
                                                  <input
                                                    autoFocus
                                                    className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-wider flex-1 text-primary min-w-0"
                                                    value={editCategoryName}
                                                    onChange={(e) =>
                                                      setEditCategoryName(e.target.value)
                                                    }
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter")
                                                        handleUpdateCategory(categoryId);
                                                    }}
                                                    onBlur={() => setEditingCategoryId(null)}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                  />
                                                ) : (
                                                  <span
                                                    className={cn(
                                                      "text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 truncate",
                                                      isCategoryCollapsed
                                                        ? "text-muted-foreground/40 group-hover/cat:text-muted-foreground/70"
                                                        : "text-primary/80"
                                                    )}
                                                  >
                                                    {category.name}
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        <AnimatePresence initial={false}>
                                          {!isCategoryCollapsed && (
                                            <motion.div
                                              initial={
                                                snapshotCat.isDragging
                                                  ? { height: 0, opacity: 0 }
                                                  : { height: 0, opacity: 0 }
                                              }
                                              animate={
                                                snapshotCat.isDragging
                                                  ? { height: 0, opacity: 0 }
                                                  : {
                                                      height: "auto",
                                                      opacity: 1,
                                                    }
                                              }
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={
                                                snapshotCat.isDragging
                                                  ? { duration: 0 }
                                                  : {
                                                      duration: 0.3,
                                                      ease: [0.04, 0.62, 0.23, 0.98],
                                                    }
                                              }
                                              className="overflow-hidden"
                                            >
                                              <Droppable
                                                droppableId={`cat-${categoryId}`}
                                                type="project"
                                              >
                                                {(providedProj, snapshotProj) => (
                                                  <div
                                                    {...providedProj.droppableProps}
                                                    ref={providedProj.innerRef}
                                                    className={cn(
                                                      "space-y-1 min-h-8 transition-all duration-300 rounded-lg",
                                                      snapshotProj.isDraggingOver &&
                                                        "bg-primary/10",
                                                      isCollapsed ? "pt-0.5" : "mt-1.5 mb-1"
                                                    )}
                                                  >
                                                    {snapshotProj.isDraggingOver &&
                                                      categoryProjects.length === 0 && (
                                                        <div className="mx-1 rounded-md border border-dashed border-primary/30 bg-primary/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                                                          Drop project here
                                                        </div>
                                                      )}
                                                    {categoryProjects.map((p, index) =>
                                                      renderProject(p, index)
                                                    )}
                                                    {providedProj.placeholder}
                                                  </div>
                                                )}
                                              </Droppable>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuItem
                                        onClick={() => {
                                          setEditingCategoryId(categoryId);
                                          setEditCategoryName(category.name);
                                        }}
                                      >
                                        <Edit2 className="w-4 h-4 mr-2" /> Rename Category
                                      </ContextMenuItem>
                                      <ContextMenuSeparator />
                                      <ContextMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => handleDeleteCategory(categoryId)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Category
                                      </ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Server
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setIsAddingCategory(true)}>
                <FolderPlus className="w-4 h-4 mr-2" /> Add Category
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </DragDropContext>

        <div
          className={cn(
            "bg-card/30 mt-auto",
            isCollapsed ? "p-3 space-y-3 flex flex-col items-center" : "p-4 space-y-2"
          )}
        >
          {(updateStatus === "available" || updateStatus === "downloaded") && (
            <AnimatePresence mode="wait">
              {isCollapsed ? (
                <motion.button
                  key="update-collapsed"
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onClick={() => navigate("/settings/updates")}
                  title={
                    updateStatus === "downloaded"
                      ? "Update ready — open Settings to restart"
                      : "Update available — open Settings to install"
                  }
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    updateStatus === "downloaded"
                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-400/20"
                      : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20"
                  )}
                >
                  {updateStatus === "downloaded" ? (
                    <RefreshCw className="h-5 w-5" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </motion.button>
              ) : (
                <motion.div
                  key="update-expanded"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  onClick={() => navigate("/settings/updates")}
                  className={cn(
                    "rounded-xl border overflow-hidden cursor-pointer transition-all duration-200",
                    "hover:border-white/20 hover:shadow-lg hover:shadow-primary/5",
                    updateStatus === "downloaded"
                      ? "border-emerald-500/30 bg-linear-to-b from-emerald-950/40 via-black/30 to-black/40"
                      : "border-white/10 bg-linear-to-b from-primary/10 via-black/20 to-black/30"
                  )}
                >
                  <div className="relative p-4 space-y-3">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--tw-gradient-from),transparent)] from-primary/10 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-start gap-3">
                      <div
                        className={cn(
                          "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
                          updateStatus === "downloaded"
                            ? "bg-emerald-500/25 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                            : "bg-primary/25 text-primary shadow-[0_0_20px_hsl(var(--primary)_/0.15)]"
                        )}
                      >
                        {updateStatus === "downloaded" ? (
                          <RefreshCw className="h-5 w-5" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground leading-tight">
                          {updateStatus === "downloaded" ? "Update ready" : "Update available"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {updateStatus === "downloaded"
                            ? "Restart the app to use the new version."
                            : "A new version is ready to install."}
                        </p>
                        {updateVersion && (
                          <span
                            className={cn(
                              "inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded",
                              updateStatus === "downloaded"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-primary/20 text-primary"
                            )}
                          >
                            v{updateVersion}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative z-10">
                      <span
                        className={cn(
                          "block w-full text-center py-2 rounded-lg text-xs font-medium transition-colors",
                          updateStatus === "downloaded"
                            ? "bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/35"
                            : "bg-primary/25 text-primary-foreground hover:bg-primary/35"
                        )}
                      >
                        {updateStatus === "downloaded"
                          ? "Open Settings to restart"
                          : "Open Settings to install"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full shrink-0 gap-2",
              isCollapsed ? "w-10 h-10 p-0 justify-center" : "justify-start"
            )}
            onClick={() => navigate("/settings")}
            title="App Settings"
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
          </Button>
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="discord-collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Button
                  variant="ghost"
                  className="w-10 h-10 rounded-lg p-0 flex items-center justify-center shrink-0"
                  onClick={() => {
                    setWidth(280);
                    setIsCollapsed(false);
                  }}
                >
                  {getDiscordAvatarUrl() ? (
                    <img
                      src={getDiscordAvatarUrl()}
                      alt="Discord"
                      className="w-8 h-8 rounded-md object-cover"
                    />
                  ) : (
                    <MessageCircle className="h-5 w-5" />
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="discord-expanded"
                layoutId="discord-card-container"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
              >
                <div
                  className="relative p-4 bg-cover bg-center"
                  style={{
                    backgroundImage: getDiscordBannerUrl()
                      ? `url(${getDiscordBannerUrl()})`
                      : undefined,
                  }}
                >
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-3">
                      {getDiscordAvatarUrl() ? (
                        <img
                          src={getDiscordAvatarUrl()}
                          alt="Discord"
                          className="w-12 h-12 rounded-lg border border-white/10 shadow-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                          <MessageCircle className="text-white h-6 w-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate text-white">
                          {discordInfo?.guild?.name || "Join Community"}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                          <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {discordInfo?.approximate_presence_count?.toLocaleString("en-US") ||
                              "-"}
                          </span>
                          <span>•</span>
                          <span>
                            {discordInfo?.approximate_member_count?.toLocaleString("en-US") || "-"}{" "}
                            Members
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-medium"
                      onClick={() => API.openExternal(`https://discord.gg/${DISCORD_INVITE_CODE}`)}
                    >
                      Join Server
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
});

export default Sidebar;

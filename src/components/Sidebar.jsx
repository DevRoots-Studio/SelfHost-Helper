import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Settings,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  projectsAtom,
  categoriesAtom,
  selectedProjectAtom,
  selectedProjectIdAtom,
  isAddProjectModalOpenAtom,
  isProjectSettingsOpenAtom,
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
  const [projects, setProjects] = useAtom(projectsAtom);
  const selectedProject = useAtomValue(selectedProjectAtom);
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);

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
    localStorage.setItem(
      "collapsedCategories",
      JSON.stringify(collapsedCategories),
    );
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

  const isInCategory = (project, categoryId) =>
    toNullableNumber(project.categoryId) === categoryId;

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
      prev.includes(normalizedId)
        ? prev.filter((i) => i !== normalizedId)
        : [...prev, normalizedId],
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

    const movedProject = projects.find(
      (project) => toNullableNumber(project.id) === projectId,
    );
    if (!movedProject) return;

    const isSameCategory = sourceCategoryId === destinationCategoryId;

    const sourceWithoutMoved = getSortedProjectsInCategory(sourceCategoryId)
      .filter((project) => toNullableNumber(project.id) !== projectId)
      .map((project) => ({ ...project }));

    const destinationWithoutMoved = (isSameCategory
      ? sourceWithoutMoved
      : getSortedProjectsInCategory(destinationCategoryId).filter(
          (project) => toNullableNumber(project.id) !== projectId,
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
    const finalSourceProjects = isSameCategory
      ? finalDestinationProjects
      : sourceWithoutMoved;

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
        (item) => toNullableNumber(item.id) === currentId,
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
          (item) => toNullableNumber(item.id) === currentId,
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
        ...buildProjectReorderUpdates(
          finalDestinationProjects,
          destinationCategoryId,
        ),
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

  const reorderRootLevel = async ({
    draggableKind,
    draggableId,
    destinationIndex,
  }) => {
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
      const project = projects.find(
        (item) => toNullableNumber(item.id) === draggableId,
      );
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
            (project) => toNullableNumber(project.id) !== draggableId,
          )
        : [];

    const updatedProjects = projects.map((project) => {
      const currentId = toNullableNumber(project.id);
      if (currentId === null) return project;

      const orderInfo = newOrders.find(
        (item) => item.isProject && item.id === currentId,
      );

      if (draggableKind === "project" && currentId === draggableId) {
        return {
          ...project,
          categoryId: null,
          order: orderInfo?.order ?? project.order,
        };
      }

      if (movedProjectSourceCategoryId !== null) {
        const sourceOrder = sourceCategoryProjectsWithoutMoved.findIndex(
          (item) => toNullableNumber(item.id) === currentId,
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
      const orderInfo = newOrders.find(
        (item) => !item.isProject && item.id === currentId,
      );
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
                movedProjectSourceCategoryId,
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
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
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
      const destinationCategoryId = parseCategoryDroppableId(
        destination.droppableId,
      );
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
    if (
      confirm(
        "Are you sure? This will remove the project from SelfHost Helper.",
      )
    ) {
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

  const renderFolderLogo = (
    categoryId,
    { compact = false, enlargeWhenEmpty = false } = {},
  ) => {
    const normalizedCategoryId = toNullableNumber(categoryId);
    const categoryProjects = getSortedProjectsInCategory(normalizedCategoryId);
    const isEmpty = categoryProjects.length === 0;

    const wrapperClass = cn(
      "rounded-lg border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center shrink-0",
      compact ? "w-8 h-8" : "w-10 h-10",
      isEmpty && enlargeWhenEmpty && (compact ? "w-10 h-10" : "w-12 h-12"),
    );

    if (!isEmpty) {
      return (
        <div className={wrapperClass}>
          <div className="grid grid-cols-2 gap-0.5 p-1 place-items-center w-full h-full">
            {categoryProjects.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-[2px] overflow-hidden bg-white/10",
                  compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5",
                )}
              >
                {p.icon ? (
                  <img
                    alt=""
                    src={
                      p.icon.match(/^(https?:\/\/|data:)/)
                        ? p.icon
                        : `media:///${p.icon.replace(/\\/g, "/")}?t=${new Date(
                            p.updatedAt,
                          ).getTime()}`
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[6px] font-bold">
                    {p.name.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={wrapperClass}>
        <FolderIcon
          className={cn(
            "text-muted-foreground/40",
            compact ? "w-4 h-4" : "w-5 h-5",
          )}
        />
      </div>
    );
  };

  const navigate = useNavigate();
  const [width, setWidth] = useState(72);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isOverlayMode, setIsOverlayMode] = useState(
    typeof window !== "undefined" && window.innerWidth <= 900,
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [discordInfo, setDiscordInfo] = useState(null);

  const DISCORD_INVITE_CODE = "C62mj58Q2D";

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
    const isSelected = selectedProject?.id === p.id;
    return (
      <Draggable
        key={`project-${p.id}`}
        draggableId={`project-${p.id}`}
        index={index}
      >
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
                    onClick={() => setSelectedProjectId(p.id)}
                    className={cn(
                      "sidebar-item group relative transition-all duration-200 select-none",
                      width < 120 ? "collapsed" : "",
                      width < 120 &&
                        toNullableNumber(p.categoryId) === null &&
                        !isSelected
                        ? "border-white/5"
                        : "",
                      isSelected ? "active" : "hover:bg-white/5",
                      width < 120 ? "mx-auto" : "px-3 py-2.5",
                      snapshot.isDragging &&
                        "opacity-95 ring-2 ring-primary bg-primary/20 shadow-2xl",
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
                        width < 120 ? "w-10 h-10" : "w-10 h-10",
                      )}
                    >
                      {p.icon ? (
                        <div
                          className={cn(
                            "rounded-lg overflow-hidden flex items-center justify-center transition-all duration-300",
                            width < 120
                              ? "w-10 h-10 rounded-xl"
                              : "w-8 h-8 rounded-md",
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
                            width < 120 ? "w-10 h-10 rounded-xl" : "w-8 h-8",
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
                              className="bg-transparent border-none outline-none text-sm font-medium flex-1 text-primary"
                              value={editProjectName}
                              onChange={(e) => setEditProjectName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateProject(p.id);
                                if (e.key === "Escape") setEditingProjectId(null);
                              }}
                              onBlur={() => setEditingProjectId(null)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="font-medium truncate text-sm flex-1">
                              {p.name}
                            </span>
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
                          : "relative right-auto top-auto ml-auto transform-none",
                      )}
                    >
                      {p.status === "running" && (
                        <div className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        </div>
                      )}
                      {p.status === "error" && (
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                      )}
                      {(!p.status || p.status === "stopped") && width >= 120 && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                      )}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => {
                      setSelectedProjectId(p.id);
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
            : "",
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
        <div
          className={cn(
            "flex items-center shrink-0 drag h-16 transition-all duration-300",
            width < 120 ? "justify-center px-0" : "justify-between px-4",
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <AnimatePresence>
              {width >= 120 && (
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-bold text-lg tracking-tight"
                >
                  SelfHost
                </motion.h1>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 shrink-0 no-drag">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleSidebar()}
              className="w-8 h-8 p-0 hover:bg-primary/20 hover:text-primary cursor-pointer flex items-center justify-center"
            >
              {width < 120 ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          <AddProjectDialog onProjectsChange={onProjectsChange} />
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  "flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar",
                  isCollapsed ? "space-y-3" : "space-y-5",
                )}
              >
                {isAddingCategory && !isCollapsed && (
                  <div className="px-2 py-1 bg-white/5 rounded-lg flex items-center gap-2 border border-primary/20">
                    <input
                      autoFocus
                      className="bg-transparent border-none outline-none text-sm flex-1 pl-1"
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

                <Droppable
                  droppableId="sidebar-content"
                  type="project"
                  isCombineEnabled
                >
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        isCollapsed ? "space-y-3" : "space-y-5",
                        "min-h-full pb-20 transition-all",
                      )}
                    >
                      {[
                        ...categories.map((c) => ({ ...c, isCategory: true })),
                        ...projects
                          .filter((p) => toNullableNumber(p.categoryId) === null)
                          .map((p) => ({ ...p, isProject: true })),
                      ]
                        .sort(
                          (a, b) =>
                            normalizeOrder(a.order) - normalizeOrder(b.order),
                        )
                        .map((item, index) => {
                          if (item.isProject) {
                            return renderProject(item, index);
                          }

                          const category = item;
                          const categoryId = toNullableNumber(category.id);
                          if (categoryId === null) return null;
                          const categoryProjects =
                            getSortedProjectsInCategory(categoryId);
                          const isCategoryCollapsed =
                            collapsedCategories.includes(categoryId);
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
                                                categoryProjects.length === 0
                                                  ? "w-14"
                                                  : "w-12",
                                                isCategoryCollapsed
                                                  ? "hover:bg-white/5 border-2 border-white/5"
                                                  : "bg-primary/[0.07] shadow-lg ring-1 ring-white/10",
                                              )
                                            : cn(
                                                "rounded-xl border transition-all duration-500",
                                                isCategoryCollapsed
                                                  ? cn(
                                                      "bg-primary/[0.07] border-white/5 hover:bg-white/[0.06] hover:border-white/10 hover:shadow-lg",
                                                      categoryProjects.length ===
                                                        0 && "min-h-[4.25rem]",
                                                    )
                                                  : "bg-primary/[0.07] border-primary/20 p-1.5 shadow-2xl shadow-black/40",
                                              ),
                                          snapshotCat.isDragging &&
                                            "opacity-80 scale-95",
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            "flex items-center justify-between group/cat",
                                            !isCollapsed &&
                                              (isCategoryCollapsed &&
                                              categoryProjects.length === 0
                                                ? "px-2 py-2.5"
                                                : "px-2 py-1.5"),
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              "flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none",
                                              isCollapsed
                                                ? "w-12 h-12 justify-center"
                                                : "",
                                            )}
                                            onClick={() =>
                                              toggleCategory(categoryId)
                                            }
                                            {...providedCat.dragHandleProps}
                                          >
                                            {isCollapsed ? (
                                              renderFolderLogo(categoryId, {
                                                enlargeWhenEmpty: true,
                                              })
                                            ) : (
                                              <>
                                                <div className="opacity-0 group-hover/cat:opacity-30 transition-opacity p-1 -ml-1">
                                                  <GripVertical className="h-3 w-3" />
                                                </div>
                                                <ChevronDown
                                                  className={cn(
                                                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                                    isCategoryCollapsed &&
                                                      "-rotate-90",
                                                  )}
                                                />
                                                {isCategoryCollapsed && (
                                                  <div className="mr-1">
                                                    {renderFolderLogo(
                                                      categoryId,
                                                      {
                                                        compact: true,
                                                        enlargeWhenEmpty: true,
                                                      },
                                                    )}
                                                  </div>
                                                )}
                                                {editingCategoryId ===
                                                categoryId ? (
                                                  <input
                                                    autoFocus
                                                    className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-wider flex-1 text-primary"
                                                    value={editCategoryName}
                                                    onChange={(e) =>
                                                      setEditCategoryName(
                                                        e.target.value,
                                                      )
                                                    }
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter")
                                                        handleUpdateCategory(
                                                          categoryId,
                                                        );
                                                    }}
                                                    onBlur={() =>
                                                      setEditingCategoryId(null)
                                                    }
                                                  />
                                                ) : (
                                                  <span
                                                    className={cn(
                                                      "text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 truncate",
                                                      isCategoryCollapsed
                                                        ? "text-muted-foreground/40 group-hover/cat:text-muted-foreground/70"
                                                        : "text-primary/80",
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
                                                      ease: [
                                                        0.04, 0.62, 0.23, 0.98,
                                                      ],
                                                    }
                                              }
                                              className="overflow-hidden"
                                            >
                                              <Droppable
                                                droppableId={`cat-${categoryId}`}
                                                type="project"
                                              >
                                                {(
                                                  providedProj,
                                                  snapshotProj,
                                                ) => (
                                                  <div
                                                    {...providedProj.droppableProps}
                                                    ref={providedProj.innerRef}
                                                    className={cn(
                                                      "space-y-1 min-h-[2rem] transition-all duration-300 rounded-lg",
                                                      snapshotProj.isDraggingOver &&
                                                        "bg-primary/10",
                                                      isCollapsed
                                                        ? "pb-2"
                                                        : "mt-1.5 mb-1",
                                                    )}
                                                  >
                                                    {snapshotProj.isDraggingOver &&
                                                      categoryProjects.length ===
                                                        0 && (
                                                        <div className="mx-1 rounded-md border border-dashed border-primary/30 bg-primary/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                                                          Drop project here
                                                        </div>
                                                      )}
                                                    {categoryProjects.map(
                                                      (p, index) =>
                                                        renderProject(p, index),
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
                                        <Edit2 className="w-4 h-4 mr-2" />{" "}
                                        Rename Category
                                      </ContextMenuItem>
                                      <ContextMenuSeparator />
                                      <ContextMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() =>
                                          handleDeleteCategory(categoryId)
                                        }
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />{" "}
                                        Delete Category
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
            isCollapsed
              ? "p-3 space-y-3 flex flex-col items-center"
              : "p-4 space-y-2",
          )}
        >
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
                            {discordInfo?.approximate_presence_count?.toLocaleString() ||
                              "-"}
                          </span>
                          <span>•</span>
                          <span>
                            {discordInfo?.approximate_member_count?.toLocaleString() ||
                              "-"}{" "}
                            Members
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-medium"
                      onClick={() =>
                        API.openExternal(
                          `https://discord.gg/${DISCORD_INVITE_CODE}`,
                        )
                      }
                    >
                      Join Server
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout>
            <Button
              variant="ghost"
              onClick={() => navigate("/settings")}
              className={cn(
                "w-full flex items-center gap-2 transition-all duration-200 text-muted-foreground hover:text-foreground cursor-pointer",
                isCollapsed ? "justify-center px-0" : "justify-start px-3",
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  className="truncate"
                >
                  Settings
                </motion.span>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
});

export default Sidebar;

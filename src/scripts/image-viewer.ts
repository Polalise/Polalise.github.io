interface ViewerItem {
  src: string;
  alt: string;
  caption: string;
  scope: string;
  evidence: string;
  trigger: HTMLAnchorElement;
}

const requireElement = <T extends Element>(root: ParentNode, selector: string) => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Image viewer is missing ${selector}`);
  return element;
};

document.querySelectorAll<HTMLDialogElement>("[data-image-viewer]").forEach((dialog) => {
  if (typeof dialog.showModal !== "function") return;
  const gallery = dialog.closest<HTMLElement>(".project-gallery");
  if (!gallery) return;

  const items: ViewerItem[] = Array.from(gallery.querySelectorAll<HTMLAnchorElement>("[data-image-viewer-trigger]"))
    .map((trigger) => ({
      src: trigger.dataset.viewerSrc ?? trigger.href,
      alt: trigger.dataset.viewerAlt ?? "",
      caption: trigger.dataset.viewerCaption ?? "",
      scope: trigger.dataset.viewerScope ?? "",
      evidence: trigger.dataset.viewerEvidence ?? "",
      trigger
    }));
  if (items.length === 0) return;

  const stage = requireElement<HTMLElement>(dialog, "[data-viewer-stage]");
  const image = document.createElement("img");
  image.dataset.viewerImage = "";
  image.alt = "";
  image.draggable = false;
  image.hidden = true;
  stage.append(image);
  const loading = requireElement<HTMLElement>(dialog, "[data-viewer-loading]");
  const error = requireElement<HTMLElement>(dialog, "[data-viewer-error]");
  const counter = requireElement<HTMLElement>(dialog, "[data-viewer-counter]");
  const scope = requireElement<HTMLElement>(dialog, "[data-viewer-scope]");
  const caption = requireElement<HTMLElement>(dialog, "[data-viewer-caption]");
  const evidence = requireElement<HTMLElement>(dialog, "[data-viewer-evidence]");
  const direct = requireElement<HTMLAnchorElement>(dialog, "[data-viewer-direct]");
  const closeButton = requireElement<HTMLButtonElement>(dialog, "[data-viewer-close]");
  const previousButton = requireElement<HTMLButtonElement>(dialog, "[data-viewer-previous]");
  const nextButton = requireElement<HTMLButtonElement>(dialog, "[data-viewer-next]");
  const navigation = requireElement<HTMLElement>(dialog, "[data-viewer-navigation]");
  const zoomOutButton = requireElement<HTMLButtonElement>(dialog, "[data-viewer-zoom-out]");
  const zoomInButton = requireElement<HTMLButtonElement>(dialog, "[data-viewer-zoom-in]");
  const resetButton = requireElement<HTMLButtonElement>(dialog, "[data-viewer-reset]");
  const scaleOutput = requireElement<HTMLOutputElement>(dialog, "[data-viewer-scale]");
  const retryButton = requireElement<HTMLButtonElement>(dialog, "[data-viewer-retry]");
  const panControls = requireElement<HTMLElement>(dialog, "[data-viewer-pan]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const zoomLevels = [1, 1.5, 2] as const;

  let currentIndex = 0;
  let requestId = 0;
  let opener: HTMLAnchorElement | null = null;
  let zoomIndex = 0;
  let panX = 0;
  let panY = 0;
  let pointerId: number | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerPanX = 0;
  let pointerPanY = 0;
  let savedOverflow = "";

  const currentZoom = () => zoomLevels[zoomIndex];

  const clampPan = () => {
    const zoom = currentZoom();
    const maxX = Math.max(0, image.clientWidth * (zoom - 1) / 2);
    const maxY = Math.max(0, image.clientHeight * (zoom - 1) / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  };

  const renderTransform = () => {
    clampPan();
    const zoom = currentZoom();
    image.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
    scaleOutput.value = `${Math.round(zoom * 100)}%`;
    zoomOutButton.disabled = zoomIndex === 0;
    zoomInButton.disabled = zoomIndex === zoomLevels.length - 1;
    resetButton.disabled = zoomIndex === 0 && panX === 0 && panY === 0;
    panControls.hidden = zoom === 1;
    stage.dataset.zoomed = String(zoom > 1);
  };

  const resetZoom = () => {
    zoomIndex = 0;
    panX = 0;
    panY = 0;
    renderTransform();
  };

  const setLoadState = (state: "loading" | "ready" | "error") => {
    stage.dataset.state = state;
    stage.setAttribute("aria-busy", String(state === "loading"));
    loading.hidden = state !== "loading";
    image.hidden = state !== "ready";
    error.hidden = state !== "error";
    zoomOutButton.disabled = state !== "ready" || zoomIndex === 0;
    zoomInButton.disabled = state !== "ready" || zoomIndex === zoomLevels.length - 1;
    resetButton.disabled = state !== "ready" || (zoomIndex === 0 && panX === 0 && panY === 0);
  };

  const updateNavigation = () => {
    navigation.hidden = items.length === 1;
    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === items.length - 1;
  };

  const loadCurrent = () => {
    const item = items[currentIndex];
    const token = ++requestId;
    resetZoom();
    setLoadState("loading");
    image.removeAttribute("src");
    image.alt = item.alt;
    counter.textContent = `${currentIndex + 1} / ${items.length}`;
    scope.textContent = item.scope;
    caption.textContent = item.caption;
    evidence.textContent = `근거: ${item.evidence}`;
    direct.href = item.src;
    updateNavigation();

    const probe = new Image();
    probe.decoding = "async";
    probe.addEventListener("load", () => {
      if (token !== requestId || !dialog.open) return;
      image.src = item.src;
      setLoadState("ready");
      renderTransform();
    }, { once: true });
    probe.addEventListener("error", () => {
      if (token !== requestId || !dialog.open) return;
      setLoadState("error");
    }, { once: true });
    probe.src = item.src;
  };

  const moveTo = (index: number) => {
    if (index < 0 || index >= items.length || index === currentIndex) return;
    currentIndex = index;
    loadCurrent();
  };

  const panBy = (x: number, y: number) => {
    if (currentZoom() === 1) return;
    panX += x;
    panY += y;
    renderTransform();
  };

  items.forEach((item, index) => {
    item.trigger.addEventListener("click", (event) => {
      event.preventDefault();
      opener = item.trigger;
      currentIndex = index;
      savedOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      dialog.showModal();
      loadCurrent();
      closeButton.focus({ preventScroll: true });
    });
  });

  closeButton.addEventListener("click", () => dialog.close());
  previousButton.addEventListener("click", () => moveTo(currentIndex - 1));
  nextButton.addEventListener("click", () => moveTo(currentIndex + 1));
  retryButton.addEventListener("click", loadCurrent);
  zoomOutButton.addEventListener("click", () => {
    zoomIndex = Math.max(0, zoomIndex - 1);
    renderTransform();
  });
  zoomInButton.addEventListener("click", () => {
    zoomIndex = Math.min(zoomLevels.length - 1, zoomIndex + 1);
    renderTransform();
  });
  resetButton.addEventListener("click", resetZoom);

  dialog.querySelectorAll<HTMLButtonElement>("[data-viewer-pan-x], [data-viewer-pan-y]").forEach((button) => {
    button.addEventListener("click", () => {
      panBy(Number(button.dataset.viewerPanX ?? 0), Number(button.dataset.viewerPanY ?? 0));
    });
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") return;
    if (currentZoom() > 1) {
      const panKeys: Record<string, [number, number]> = {
        ArrowLeft: [32, 0], ArrowRight: [-32, 0], ArrowUp: [0, 32], ArrowDown: [0, -32]
      };
      const movement = panKeys[event.key];
      if (!movement) return;
      event.preventDefault();
      panBy(...movement);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveTo(currentIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveTo(currentIndex + 1);
    }
  });

  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) return;
    pointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerPanX = panX;
    pointerPanY = panY;
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId || currentZoom() === 1) return;
    panX = pointerPanX + event.clientX - pointerStartX;
    panY = pointerPanY + event.clientY - pointerStartY;
    renderTransform();
  });

  const finishPointer = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    if (currentZoom() === 1 && Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      moveTo(deltaX < 0 ? currentIndex + 1 : currentIndex - 1);
    }
    pointerId = null;
  };
  stage.addEventListener("pointerup", finishPointer);
  stage.addEventListener("pointercancel", (event) => {
    if (pointerId === event.pointerId) pointerId = null;
  });

  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      dialog.close();
    }
  });

  dialog.addEventListener("close", () => {
    requestId += 1;
    pointerId = null;
    resetZoom();
    document.documentElement.style.overflow = savedOverflow;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) image.style.transitionDuration = "0s";
    else image.style.removeProperty("transition-duration");
  });
});

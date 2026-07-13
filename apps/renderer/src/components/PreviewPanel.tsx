import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutPage, LayoutResult, RenderConfig } from '@handscript/shared';
import { resolvePageSize } from '@handscript/shared';
import { renderPageSvg } from '@handscript/export-engine';
import { useStore } from '../state/store.js';

const PX_PER_MM = 96 / 25.4;
/** Below this on-screen density the ink filter only costs sharpness. */
const FILTER_MIN_PX_PER_MM = 2.6;

/**
 * Live paginated preview.
 *
 * Pages are virtualised: each page slot keeps its exact pixel size, but the
 * (comparatively expensive) SVG markup is only generated and mounted while the
 * slot is near the viewport. This keeps 500+ page documents smooth — offscreen
 * pages cost one empty <div> each.
 */
export function PreviewPanel({
  layout,
  config,
}: {
  layout: LayoutResult;
  config: RenderConfig;
}): JSX.Element {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const scrollRef = useRef<HTMLDivElement>(null);

  const size = resolvePageSize(config.page.sizeId, config.page.orientation, {
    width: config.page.width,
    height: config.page.height,
  });
  const pageW = size.width * PX_PER_MM * ui.zoom;
  const pageH = size.height * PX_PER_MM * ui.zoom;
  const draft = pageW / size.width < FILTER_MIN_PX_PER_MM;

  const currentPage = Math.min(ui.currentPage, layout.pages.length - 1);
  const visiblePages: LayoutPage[] =
    ui.viewMode === 'single'
      ? layout.pages.slice(currentPage, currentPage + 1)
      : ui.viewMode === 'two'
        ? layout.pages.slice(currentPage, currentPage + 2)
        : layout.pages;

  // Reset scroll to top when switching documents/pages in paged modes.
  useEffect(() => {
    if (ui.viewMode !== 'continuous') scrollRef.current?.scrollTo({ top: 0 });
  }, [currentPage, ui.viewMode]);

  return (
    <section className="panel panel-preview" aria-label="Handwriting preview">
      {ui.showThumbnails && (
        <ThumbnailRail
          layout={layout}
          config={config}
          currentPage={currentPage}
          onSelect={(index) => setUi({ currentPage: index })}
        />
      )}

      <div ref={scrollRef} className={`preview-scroll ${ui.showThumbnails ? 'with-thumbs' : ''}`}>
        <div className={`preview-pages ${ui.viewMode === 'two' ? 'two' : ''}`}>
          {visiblePages.map((page) => (
            <div key={page.pageIndex} id={`page-${page.pageIndex}`}>
              <LazyPage
                page={page}
                config={config}
                pageCount={layout.pages.length}
                widthPx={pageW}
                heightPx={pageH}
                draft={draft}
              />
              <div className="page-number-chip">
                Page {page.pageIndex + 1} of {layout.pages.length}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="zoom-chip" role="group" aria-label="Zoom and page navigation">
        {ui.viewMode !== 'continuous' && (
          <>
            <button
              className="btn"
              disabled={currentPage === 0}
              onClick={() => setUi({ currentPage: Math.max(0, currentPage - 1) })}
              aria-label="Previous page"
            >
              ‹
            </button>
            <button
              className="btn"
              disabled={currentPage >= layout.pages.length - 1}
              onClick={() =>
                setUi({ currentPage: Math.min(layout.pages.length - 1, currentPage + 1) })
              }
              aria-label="Next page"
            >
              ›
            </button>
          </>
        )}
        <button
          className="btn"
          onClick={() => setUi({ zoom: Math.max(0.25, +(ui.zoom - 0.25).toFixed(2)) })}
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="btn" aria-live="polite">
          {Math.round(ui.zoom * 100)}%
        </span>
        <button
          className="btn"
          onClick={() => setUi({ zoom: Math.min(2, +(ui.zoom + 0.25).toFixed(2)) })}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </section>
  );
}

/** One page slot; SVG mounts only while near the viewport. */
const LazyPage = memo(function LazyPage({
  page,
  config,
  pageCount,
  widthPx,
  heightPx,
  draft = false,
}: {
  page: LayoutPage;
  config: RenderConfig;
  pageCount: number;
  widthPx: number;
  heightPx: number;
  /** Skip the ink filter (thumbnails / low zoom) for crisp small renders. */
  draft?: boolean;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(page.pageIndex < 3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => setVisible(entry.isIntersecting)),
      { rootMargin: '800px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const svg = useMemo(
    () => (visible ? renderPageSvg(page, config, { pageCount, inkFilter: !draft }) : null),
    [visible, page, config, pageCount, draft],
  );

  const style = { width: widthPx, height: heightPx };
  return svg ? (
    <div
      ref={ref}
      className="page-frame"
      style={style}
      // Safe: the SVG is generated by our own export engine from XML-escaped
      // content — no untrusted markup can reach this string.
      dangerouslySetInnerHTML={{
        __html: svg.replace(/^<svg /, `<svg width="${widthPx}" height="${heightPx}" `),
      }}
    />
  ) : (
    <div ref={ref} className="page-placeholder" style={style} aria-hidden="true" />
  );
});

/** Clickable page thumbnails. */
function ThumbnailRail({
  layout,
  config,
  currentPage,
  onSelect,
}: {
  layout: LayoutResult;
  config: RenderConfig;
  currentPage: number;
  onSelect: (index: number) => void;
}): JSX.Element {
  const size = resolvePageSize(config.page.sizeId, config.page.orientation, {
    width: config.page.width,
    height: config.page.height,
  });
  const thumbW = 96;
  const thumbH = (size.height / size.width) * thumbW;

  return (
    <aside className="thumb-rail" aria-label="Page thumbnails">
      {layout.pages.map((page) => (
        <button
          key={page.pageIndex}
          className={`thumb ${page.pageIndex === currentPage ? 'active' : ''}`}
          onClick={() => {
            onSelect(page.pageIndex);
            document
              .getElementById(`page-${page.pageIndex}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          aria-label={`Go to page ${page.pageIndex + 1}`}
        >
          <LazyPage
            page={page}
            config={config}
            pageCount={layout.pages.length}
            widthPx={thumbW}
            heightPx={thumbH}
            draft
          />
        </button>
      ))}
    </aside>
  );
}

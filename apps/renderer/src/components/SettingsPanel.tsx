import type { ProjectDocument, RandomnessProfile } from '@handscript/shared';
import { PAGE_SIZES_MM } from '@handscript/shared';
import { listInks, listStyles } from '@handscript/handwriting-engine';
import { PAPER_TEMPLATES } from '@handscript/paper-engine';
import { EXPORT_DPI_CHOICES } from '../services/exporter.js';
import { useStore } from '../state/store.js';

const RANDOMNESS_CHANNELS: { key: keyof RandomnessProfile; label: string }[] = [
  { key: 'intensity', label: 'Overall intensity' },
  { key: 'characterPosition', label: 'Character position' },
  { key: 'characterAngle', label: 'Character angle' },
  { key: 'characterSize', label: 'Character size' },
  { key: 'baseline', label: 'Baseline wobble' },
  { key: 'letterSpacing', label: 'Letter spacing' },
  { key: 'wordSpacing', label: 'Word spacing' },
  { key: 'lineSpacing', label: 'Line spacing' },
];

/** Right-hand settings panel: everything that shapes the rendered page. */
export function SettingsPanel({ doc }: { doc: ProjectDocument }): JSX.Element {
  const updateConfig = useStore((s) => s.updateConfig);
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const config = doc.config;

  return (
    <aside className="panel panel-settings" aria-label="Document settings">
      <section className="setting-section">
        <h3>Handwriting style</h3>
        <div className="chip-grid">
          {listStyles().map((style) => (
            <button
              key={style.id}
              className={`chip ${config.styleId === style.id ? 'selected' : ''}`}
              onClick={() => updateConfig((c) => void (c.styleId = style.id))}
              aria-pressed={config.styleId === style.id}
              title={style.description}
            >
              {style.label}
              <small>{style.connected ? 'connected' : 'detached'}</small>
            </button>
          ))}
        </div>
        <div className="setting-row" style={{ marginTop: 10 }}>
          <label htmlFor="size-factor">Size</label>
          <input
            id="size-factor"
            type="range"
            min={0.6}
            max={1.8}
            step={0.05}
            value={config.sizeFactor}
            onChange={(e) =>
              updateConfig((c) => void (c.sizeFactor = Number(e.target.value)), 'sizeFactor')
            }
          />
        </div>
        <div className="setting-row">
          <label htmlFor="seed">Seed</label>
          <input
            id="seed"
            type="number"
            value={config.seed}
            min={0}
            onChange={(e) =>
              updateConfig((c) => void (c.seed = Math.max(0, Number(e.target.value) | 0)), 'seed')
            }
          />
        </div>
      </section>

      <section className="setting-section">
        <h3>Pen &amp; ink</h3>
        <div className="chip-grid">
          {listInks().map((ink) => (
            <button
              key={ink.id}
              className={`chip ${config.inkId === ink.id ? 'selected' : ''}`}
              onClick={() => updateConfig((c) => void (c.inkId = ink.id))}
              aria-pressed={config.inkId === ink.id}
            >
              <span style={{ color: ink.color }}>●</span> {ink.label}
            </button>
          ))}
        </div>
      </section>

      <section className="setting-section">
        <h3>Randomness</h3>
        {RANDOMNESS_CHANNELS.map(({ key, label }) => (
          <div className="setting-row" key={key}>
            <label htmlFor={`rand-${key}`}>{label}</label>
            <input
              id={`rand-${key}`}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.randomness[key]}
              onChange={(e) =>
                updateConfig(
                  (c) => void (c.randomness[key] = Number(e.target.value)),
                  `rand-${key}`,
                )
              }
            />
          </div>
        ))}
      </section>

      <section className="setting-section">
        <h3>Paper</h3>
        <div className="setting-row">
          <label htmlFor="paper-template">Template</label>
          <select
            id="paper-template"
            value={config.paper.templateId}
            onChange={(e) =>
              updateConfig((c) => void (c.paper.templateId = e.target.value as never))
            }
          >
            {PAPER_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <label htmlFor="paper-bg">Paper colour</label>
          <input
            id="paper-bg"
            type="color"
            value={config.paper.backgroundColor}
            onChange={(e) =>
              updateConfig((c) => void (c.paper.backgroundColor = e.target.value), 'paper-bg')
            }
          />
        </div>
        <div className="setting-row">
          <label htmlFor="paper-line">Line colour</label>
          <input
            id="paper-line"
            type="color"
            value={config.paper.lineColor}
            onChange={(e) =>
              updateConfig((c) => void (c.paper.lineColor = e.target.value), 'paper-line')
            }
          />
        </div>
        <div className="setting-row">
          <label htmlFor="paper-spacing">Line spacing (mm)</label>
          <input
            id="paper-spacing"
            type="number"
            min={2}
            max={40}
            step={0.5}
            value={config.paper.lineSpacing}
            onChange={(e) =>
              updateConfig(
                (c) => void (c.paper.lineSpacing = Number(e.target.value) || 8),
                'paper-spacing',
              )
            }
          />
        </div>
      </section>

      <section className="setting-section">
        <h3>Page</h3>
        <div className="setting-row">
          <label htmlFor="page-size">Size</label>
          <select
            id="page-size"
            value={config.page.sizeId}
            onChange={(e) =>
              updateConfig((c) => {
                const sizeId = e.target.value as typeof c.page.sizeId;
                c.page.sizeId = sizeId;
                if (sizeId !== 'custom') {
                  const s = PAGE_SIZES_MM[sizeId];
                  c.page.width = s.width;
                  c.page.height = s.height;
                }
              })
            }
          >
            <option value="a4">A4</option>
            <option value="a5">A5</option>
            <option value="letter">Letter</option>
            <option value="legal">Legal</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {config.page.sizeId === 'custom' && (
          <>
            <div className="setting-row">
              <label htmlFor="page-w">Width (mm)</label>
              <input
                id="page-w"
                type="number"
                min={50}
                max={1000}
                value={config.page.width}
                onChange={(e) =>
                  updateConfig((c) => void (c.page.width = Number(e.target.value) || 210), 'page-w')
                }
              />
            </div>
            <div className="setting-row">
              <label htmlFor="page-h">Height (mm)</label>
              <input
                id="page-h"
                type="number"
                min={50}
                max={1000}
                value={config.page.height}
                onChange={(e) =>
                  updateConfig(
                    (c) => void (c.page.height = Number(e.target.value) || 297),
                    'page-h',
                  )
                }
              />
            </div>
          </>
        )}
        <div className="setting-row">
          <label htmlFor="page-orientation">Orientation</label>
          <select
            id="page-orientation"
            value={config.page.orientation}
            onChange={(e) =>
              updateConfig((c) => void (c.page.orientation = e.target.value as never))
            }
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <div className="setting-row" key={side}>
            <label htmlFor={`margin-${side}`}>Margin {side} (mm)</label>
            <input
              id={`margin-${side}`}
              type="number"
              min={0}
              max={100}
              value={config.page.margins[side]}
              onChange={(e) =>
                updateConfig(
                  (c) => void (c.page.margins[side] = Number(e.target.value) || 0),
                  `margin-${side}`,
                )
              }
            />
          </div>
        ))}
        <div className="setting-row">
          <label htmlFor="line-height">Line height (×)</label>
          <input
            id="line-height"
            type="range"
            min={1.1}
            max={3}
            step={0.1}
            value={config.page.lineHeight}
            onChange={(e) =>
              updateConfig((c) => void (c.page.lineHeight = Number(e.target.value)), 'line-height')
            }
          />
        </div>
        <div className="setting-row">
          <label htmlFor="para-spacing">Paragraph spacing (lines)</label>
          <input
            id="para-spacing"
            type="range"
            min={0}
            max={2}
            step={0.25}
            value={config.page.paragraphSpacing}
            onChange={(e) =>
              updateConfig(
                (c) => void (c.page.paragraphSpacing = Number(e.target.value)),
                'para-spacing',
              )
            }
          />
        </div>
        <div className="setting-row">
          <label htmlFor="header-text">Header</label>
          <input
            id="header-text"
            type="text"
            value={config.page.header.text}
            placeholder="(empty = off)"
            onChange={(e) =>
              updateConfig((c) => {
                c.page.header.text = e.target.value;
                c.page.header.enabled = e.target.value.trim() !== '';
              }, 'header-text')
            }
          />
        </div>
        <div className="setting-row">
          <label htmlFor="footer-text">Footer</label>
          <input
            id="footer-text"
            type="text"
            value={config.page.footer.text}
            placeholder="(empty = off)"
            onChange={(e) =>
              updateConfig((c) => {
                c.page.footer.text = e.target.value;
                c.page.footer.enabled = e.target.value.trim() !== '';
              }, 'footer-text')
            }
          />
        </div>
        <div className="setting-row">
          <label htmlFor="page-numbers">Page numbers</label>
          <input
            id="page-numbers"
            type="checkbox"
            checked={config.page.pageNumbers}
            onChange={(e) => updateConfig((c) => void (c.page.pageNumbers = e.target.checked))}
          />
        </div>
      </section>

      <section className="setting-section">
        <h3>Export</h3>
        <div className="setting-row">
          <label htmlFor="export-dpi">Resolution (DPI)</label>
          <select
            id="export-dpi"
            value={ui.exportDpi}
            onChange={(e) => setUi({ exportDpi: Number(e.target.value) })}
          >
            {EXPORT_DPI_CHOICES.map((dpi) => (
              <option key={dpi} value={dpi}>
                {dpi} {dpi >= 300 ? '(print)' : '(screen)'}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <label htmlFor="export-transparent">Transparent background</label>
          <input
            id="export-transparent"
            type="checkbox"
            checked={ui.exportTransparent}
            onChange={(e) => setUi({ exportTransparent: e.target.checked })}
          />
        </div>
      </section>

      <section className="setting-section">
        <h3>Application</h3>
        <div className="setting-row">
          <label htmlFor="autosave-interval">Autosave (seconds)</label>
          <input
            id="autosave-interval"
            type="number"
            min={5}
            max={600}
            value={ui.autosaveIntervalSec}
            onChange={(e) =>
              setUi({ autosaveIntervalSec: Math.max(5, Number(e.target.value) || 30) })
            }
          />
        </div>
        <div className="setting-row">
          <label htmlFor="high-contrast">High contrast</label>
          <input
            id="high-contrast"
            type="checkbox"
            checked={ui.highContrast}
            onChange={(e) => setUi({ highContrast: e.target.checked })}
          />
        </div>
        <div className="setting-row">
          <label htmlFor="ui-scale">UI scale</label>
          <input
            id="ui-scale"
            type="range"
            min={0.85}
            max={1.4}
            step={0.05}
            value={ui.uiScale}
            onChange={(e) => setUi({ uiScale: Number(e.target.value) })}
          />
        </div>
      </section>
    </aside>
  );
}

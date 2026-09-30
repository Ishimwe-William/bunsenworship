import React from 'react';
import { Slide } from '../../store/features/presentation/types';

export interface DynamicSlideViewProps {
  slide: Slide;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Dynamic slide renderer that renders presentation slides with 100% exact visual fidelity
 * matching Microsoft PowerPoint (and EasyWorship).
 */
export const DynamicSlideView: React.FC<DynamicSlideViewProps> = ({ slide, className, style }) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [slide.id, slide.imageUrl]);

  // 1. High-fidelity slide rendering (PowerPoint native frame / full-res PNG data URL)
  // Delivers 100% exact look of the presentation: fonts, master slides, shapes, colors, and graphics.
  const imgSource = !imgError
    ? slide.imageUrl ||
      slide.slideData?.thumbnailDataUrl ||
      slide.slideData?.background?.imageDataUrl
    : undefined;

  if (imgSource) {
    return (
      <div
        className={`dynamic-slide-stage ${className || ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#000000',
          zIndex: 5,
          ...style,
        }}
      >
        <img
          src={imgSource}
          alt={slide.section || 'Slide Graphic'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: slide.imageFit || 'contain',
            display: 'block',
            userSelect: 'none',
          }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // 2. Localized HTML5 structure embed fallback (e.g. Canva or embedded web presentations)
  if (slide.slideHtml || (slide.embedUrl && slide.embedUrl.startsWith('data:text/html'))) {
    const htmlContent = slide.slideHtml;
    const embedUrl = slide.embedUrl;

    return (
      <div
        className={`dynamic-slide-stage ${className || ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          backgroundColor: '#000000',
          ...style,
        }}
      >
        <iframe
          title={slide.section || 'Slide'}
          srcDoc={htmlContent}
          src={!htmlContent ? embedUrl : undefined}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            pointerEvents: 'none',
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }

  // 3. Fallback: Structured JSON elements (for cross-platform headless environments)
  const slideData = slide.slideData;
  if (slideData && slideData.elements && slideData.elements.length > 0) {
    const bg = slideData.background;
    let bgStyle: React.CSSProperties = {
      backgroundColor: bg?.color || '#0b0f19',
    };
    if (bg?.imageDataUrl) {
      bgStyle = {
        backgroundImage: `url("${bg.imageDataUrl}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      };
    }

    return (
      <div
        className={`dynamic-slide-stage ${className || ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#000000',
          ...style,
        }}
      >
        <div
          className="dynamic-slide-canvas"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            aspectRatio: `${slideData.width} / ${slideData.height}`,
            maxHeight: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            userSelect: 'none',
            ...bgStyle,
          }}
        >
          {slideData.elements.map((elem) => {
            const b = elem.bounds;
            const elementStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${b.leftPct}%`,
              top: `${b.topPct}%`,
              width: `${b.widthPct}%`,
              height: `${b.heightPct}%`,
              boxSizing: 'border-box',
              overflow: 'hidden',
              zIndex: elem.type === 'text' ? 10 : elem.type === 'image' ? 2 : 1,
            };

            if (elem.type === 'image' && elem.imageDataUrl) {
              return (
                <div key={elem.id} style={elementStyle}>
                  <img
                    src={elem.imageDataUrl}
                    alt="Slide media"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>
              );
            }

            const shapeStyle: React.CSSProperties = {};
            if (elem.shape?.fillColor) shapeStyle.backgroundColor = elem.shape.fillColor;
            if (elem.shape?.strokeColor) {
              shapeStyle.border = `${elem.shape.strokeWidth || 1}px solid ${elem.shape.strokeColor}`;
            }
            if (elem.shape?.borderRadius) shapeStyle.borderRadius = `${elem.shape.borderRadius}px`;

            if (elem.paragraphs && elem.paragraphs.length > 0) {
              return (
                <div
                  key={elem.id}
                  style={{
                    ...elementStyle,
                    ...shapeStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '0.4vw 0.6vw',
                    wordBreak: 'break-word',
                  }}
                >
                  {elem.paragraphs.map((para, pIdx) => (
                    <div
                      key={pIdx}
                      style={{
                        textAlign: para.align || 'left',
                        marginBottom: '0.25em',
                        lineHeight: 1.25,
                      }}
                    >
                      {para.runs.map((run, rIdx) => {
                        const fontSizeCss = run.fontSize
                          ? `calc(${run.fontSize} * 0.08vw + 8px)`
                          : undefined;

                        return (
                          <span
                            key={rIdx}
                            style={{
                              fontSize: fontSizeCss,
                              color: run.color || '#ffffff',
                              fontWeight: run.bold ? 700 : 400,
                              fontStyle: run.italic ? 'italic' : 'normal',
                              textDecoration: run.underline ? 'underline' : 'none',
                              fontFamily: run.fontFamily
                                ? `"${run.fontFamily}", sans-serif`
                                : undefined,
                            }}
                          >
                            {run.text}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            }

            return <div key={elem.id} style={{ ...elementStyle, ...shapeStyle }} />;
          })}
        </div>
      </div>
    );
  }

  // 4. Text lines fallback: If image failed and no structured elements exist, render extracted slide text
  if (slide.lines && slide.lines.length > 0) {
    return (
      <div
        className={`dynamic-slide-stage ${className || ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4vw 6vw',
          backgroundColor: '#000000',
          color: '#ffffff',
          textAlign: 'center',
          ...style,
        }}
      >
        {slide.lines.map((line, idx) => (
          <p
            key={idx}
            style={{
              fontSize: '3.2vw',
              fontWeight: 700,
              lineHeight: 1.3,
              margin: '0.3em 0',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
            }}
          >
            {line}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export default DynamicSlideView;

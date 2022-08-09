import { useState } from "react";
import { getTrackBackground, Range } from "react-range";
import { tw } from "twind";
import { useInterval } from "./hooks";

export const Timeline = ({
  files = [],
  activeFileIndex = 0,
  setActiveFileIndex,
}: {
  files: File[];
  activeFileIndex: number;
  setActiveFileIndex: (index: number) => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const activeFile = files[activeFileIndex];

  useInterval(
    () => {
      const nextFileIndex = activeFileIndex + 1;
      if (nextFileIndex >= files.length - 1) setIsPlaying(false);
      setActiveFileIndex(nextFileIndex)
    },
    isPlaying ? 500 : null
  );

  return (
    <div className={tw`w-full px-3 pt-7 flex items-center gap-3`}>
      <button
        onClick={() => {
          if (activeFileIndex === files.length - 1) {
            setActiveFileIndex(0);
          }
          setIsPlaying(!isPlaying);
        }}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="24" height="24" strokeLinecap="round" className={tw`text-[#0969da]`} fill="currentColor">
            <path
              d="M 9.5 9.5 L 9.5 14.5"
              strokeWidth="2"
              stroke="currentColor"
            ></path>
            <path
              d="M 14.5 9.5 L 14.5 14.5"
              strokeWidth="2"
              stroke="currentColor"
            ></path>
            <path
              fillRule="evenodd"
              d="M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19zM1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12z"
            ></path>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" className={tw`text-[#0969da]`} fill="currentColor">
            <path d="M9.5 15.584V8.416a.5.5 0 01.77-.42l5.576 3.583a.5.5 0 010 .842l-5.576 3.584a.5.5 0 01-.77-.42z"></path>
            <path
              fillRule="evenodd"
              d="M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19zM1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12z"
            ></path>
          </svg>
        )}
      </button>
      <div className={tw`flex-1 flex items-center`}>
        <Range
          step={1}
          min={0}
          max={files.length - 1}
          values={[activeFileIndex]}
          onChange={(values) => {
            if (isPlaying) {
              setIsPlaying(false);
            }
            setActiveFileIndex(values[0]);
          }}
          renderMark={({ props, index }) => (
            <div
              {...props}
              className={tw`w-[12px] h-[12px]`}
              style={{
                ...props.style,
                backgroundColor: index * 1 < activeFileIndex ? "#0969da" : "#d0d7de",
                border: "1px solid white",
                borderRadius: "100%",
              }}
            />
          )}
          renderTrack={({ props, children }) => (
            <div
              {...props}
              className={tw(
                `bg-gray-200 h-1 w-full`,

              )}
              style={{
                ...props.style,
                background: getTrackBackground({
                  values: [activeFileIndex],
                  colors: ["#0969da", "#d0d7de"],
                  min: 0,
                  max: files.length - 1,
                }),
              }}
            >
              {children}
            </div>
          )}
          renderThumb={({ props }) => (
            <div
              {...props}
              className={tw`w-4 h-4 rounded-full bg-[#0969da] flex items-center justify-center relative focus:outline-none`}
              style={{
                ...props.style,
              }}
            >
              <div
                className={tw`absolute -top-3 w-2 h-2 bg-[#0969da] transform rotate-45`}
              ></div>
              <div
                className={tw`bg-[#0969da] absolute -top-8 text-white p-1 text-xs`}
              >
                <span className={tw`font-mono`}>
                  {(activeFile?.path || "").split("/").pop()}
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </div >
  );
};
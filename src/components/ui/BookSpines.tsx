const HEIGHTS = [62, 50, 72, 56, 80, 58, 68, 52, 56, 84];
const TILTS: Record<number, { rotate: number; marginLeft: number }> = {
  8: { rotate: -11, marginLeft: 9 },
  9: { rotate: -26, marginLeft: 13 },
};

export function BookSpines() {
  return (
    <div aria-hidden="true" className="mx-auto w-fit">
      <div className="flex h-21 items-end gap-1">
        {HEIGHTS.map((height, index) => {
          const tilt = TILTS[index];
          return (
            <span
              key={index}
              className="block w-3.5 shrink-0 rounded-t-[3px]"
              style={{
                height,
                backgroundColor: `var(--spine-${(index % 4) + 1})`,
                marginLeft: tilt?.marginLeft,
                transform: tilt ? `rotate(${tilt.rotate}deg)` : undefined,
                transformOrigin: tilt ? "0 100%" : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="mx-3 border-t-2 border-dashed border-stitch" />
    </div>
  );
}

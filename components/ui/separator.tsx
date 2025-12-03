"use client"

import * as React from "react"

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = "", orientation = "horizontal", decorative = true, ...props }, ref) => {
    const base = "shrink-0 bg-border"
    const size = orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]"
    return <div ref={ref} aria-hidden={decorative} className={`${base} ${size} ${className}`} {...props} />
  }
)

Separator.displayName = "Separator"

export { Separator }


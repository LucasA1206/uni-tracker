'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

export interface DropdownItem {
  value: string
  label: string
}

export interface AnimatedDropdownProps {
  items?: readonly DropdownItem[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
  buttonClassName?: string
  optionClassName?: string
  placeholder?: string
}

const DEFAULT_ITEMS: DropdownItem[] = [
  { value: 'pending', label: 'To-Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

function normalizeStatus(value?: string) {
  if (!value) return undefined
  if (value === 'todo') return 'pending'
  if (value === 'done') return 'completed'
  return value
}

export default function AnimatedDropdown({
  items = DEFAULT_ITEMS,
  value,
  defaultValue = 'pending',
  onChange,
  className,
  buttonClassName,
  optionClassName,
  placeholder = 'Select Option',
}: AnimatedDropdownProps) {
  const mergedItems = items.length > 0 ? items : DEFAULT_ITEMS
  const normalizedValue = normalizeStatus(value) ?? normalizeStatus(defaultValue) ?? mergedItems[0]?.value
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(normalizedValue)
  const [isMounted, setIsMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (value !== undefined) {
      const nv = normalizeStatus(value) ?? value
      setSelectedValue(nv)
    }
  }, [value])

  const selected = mergedItems.find((item) => item.value === selectedValue) || mergedItems[0]

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      })
    }
    setIsOpen((prev) => !prev)
  }

  const handleSelect = (item: DropdownItem) => {
    setSelectedValue(item.value)
    onChange?.(item.value)
    setIsOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const menu = isOpen ? (
    <div
      ref={menuRef}
      role="listbox"
      style={{ ...menuStyle, animation: 'dropdownIn 0.15s ease-out forwards' }}
      className={cn(
        'overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-[#111111]',
      )}
    >
      {mergedItems.map((item) => (
        <button
          key={item.value}
          type="button"
          role="option"
          onMouseDown={(e) => {
            // Prevent outside mousedown handler from closing menu before click registers
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
            handleSelect(item)
          }}
          className={cn(
            'w-full text-left px-3 py-2 text-sm transition-colors',
            selectedValue === item.value
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'hover:bg-gray-100 dark:hover:bg-zinc-800',
            'border-b border-gray-200 last:border-b-0 dark:border-zinc-700',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  ) : null

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={handleOpen}
        className={cn(
          'inline-flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-all w-full',
          'bg-white text-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200',
          'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800',
          buttonClassName
        )}
      >
        <span>{selected?.label || placeholder}</span>
        <span
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease-in-out', display: 'inline-flex' }}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      {isMounted ? createPortal(menu, document.body) : null}
    </div>
  )
}

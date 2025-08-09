import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

interface AccordionContextType {
  type: 'single' | 'multiple'
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  openItems: Set<string>
  toggleItem: (value: string) => void
}

const AccordionContext = React.createContext<AccordionContextType | undefined>(undefined)

interface AccordionProps {
  type: 'single' | 'multiple'
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  className?: string
  children: React.ReactNode
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type, value, onValueChange, className, children }, ref) => {
    const [openItems, setOpenItems] = React.useState<Set<string>>(new Set())

    React.useEffect(() => {
      if (value) {
        if (type === 'single' && typeof value === 'string') {
          setOpenItems(new Set([value]))
        } else if (type === 'multiple' && Array.isArray(value)) {
          setOpenItems(new Set(value))
        }
      }
    }, [value, type])

    const toggleItem = React.useCallback((itemValue: string) => {
      setOpenItems(prev => {
        const newSet = new Set(prev)
        if (newSet.has(itemValue)) {
          newSet.delete(itemValue)
        } else {
          if (type === 'single') {
            newSet.clear()
          }
          newSet.add(itemValue)
        }

        if (onValueChange) {
          if (type === 'single') {
            onValueChange(newSet.size > 0 ? Array.from(newSet)[0] : '')
          } else {
            onValueChange(Array.from(newSet))
          }
        }

        return newSet
      })
    }, [type, onValueChange])

    return (
      <AccordionContext.Provider value={{ type, value, onValueChange, openItems, toggleItem }}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children }, ref) => (
    <div
      ref={ref}
      className={cn("border-b", className)}
      data-value={value}
    >
      {children}
    </div>
  )
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps {
  className?: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = React.useContext(AccordionContext)
    const itemElement = React.useRef<HTMLDivElement>(null)

    if (!context) {
      throw new Error('AccordionTrigger must be used within an Accordion')
    }

    const handleClick = (e: React.MouseEvent) => {
      if (onClick) {
        onClick(e)
      }
      
      // Find the parent AccordionItem to get the value
      const accordionItem = (e.target as HTMLElement).closest('[data-value]')
      if (accordionItem) {
        const value = accordionItem.getAttribute('data-value')
        if (value) {
          context.toggleItem(value)
        }
      }
    }

    // Find current item value
    const accordionItem = itemElement.current?.closest('[data-value]')
    const itemValue = accordionItem?.getAttribute('data-value') || ''
    const isOpen = context.openItems.has(itemValue)

    return (
      <div className="flex" ref={itemElement}>
        <button
          type="button"
          ref={ref}
          className={cn(
            "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
            className
          )}
          onClick={handleClick}
          {...props}
        >
          {children}
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
      </div>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps {
  className?: string
  children: React.ReactNode
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children }, ref) => {
    const context = React.useContext(AccordionContext)
    const contentElement = React.useRef<HTMLDivElement>(null)

    if (!context) {
      throw new Error('AccordionContent must be used within an Accordion')
    }

    // Find current item value
    const accordionItem = contentElement.current?.closest('[data-value]')
    const itemValue = accordionItem?.getAttribute('data-value') || ''
    const isOpen = context.openItems.has(itemValue)

    return (
      <div
        ref={contentElement}
        className={cn(
          "overflow-hidden text-sm transition-all duration-200",
          isOpen ? "animate-accordion-down" : "animate-accordion-up"
        )}
        style={{
          display: isOpen ? 'block' : 'none'
        }}
      >
        <div ref={ref} className={cn("pb-4 pt-0", className)}>
          {children}
        </div>
      </div>
    )
  }
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
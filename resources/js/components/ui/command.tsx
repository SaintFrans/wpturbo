import * as React from "react"
import { cn } from "cn"
import {
  Autocomplete,
  Collection,
  composeRenderProps,
  Header,
  Input,
  Menu,
  MenuItem,
  MenuSection,
  SearchField,
  Separator,
  useFilter,
  type AutocompleteProps,
  type InputProps,
  type MenuItemProps,
  type MenuProps,
  type MenuSectionProps,
  type SeparatorProps,
} from "react-aria-components"

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { SearchIcon, CheckIcon } from "lucide-react"

function Command({
  className,
  dir,
  style,
  ...props
}: Omit<AutocompleteProps, "className" | "style"> & {
  className?: string
  dir?: React.HTMLAttributes<HTMLDivElement>["dir"]
  style?: React.CSSProperties
}) {
  const { contains } = useFilter({ sensitivity: "base" })
  return (
    <div
      data-slot="command"
      dir={dir}
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col text-popover-foreground",
        className
      )}
      style={style}
    >
      <Autocomplete {...props} filter={props.filter || contains}>
        {props.children}
      </Autocomplete>
    </div>
  )
}

/**
 * The palette's shell: a raised card whose body is a *recessed* muted plate, with the result
 * list floating on it as a second surface. The muted plate is the `before` layer; every child
 * that must sit above it carries `relative` (see `CommandPanel`).
 */
function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  open,
  onOpenChange,
  className,
  showCloseButton = false,
  ...props
}: Omit<
  React.ComponentProps<typeof Dialog>,
  "children" | "className" | "isOpen" | "onOpenChange"
> & {
  title?: string
  description?: string
  open?: boolean
  onOpenChange?: (isOpen: boolean) => void
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      className={cn(
        "top-1/3 flex max-h-105 w-full max-w-xl -translate-y-0 sm:max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-lg ring-0 not-dark:bg-clip-padding",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:bg-muted/72 before:shadow-[0_1px_rgb(0_0_0/0.04)] dark:before:shadow-[0_-1px_rgb(255_255_255/0.06)]",
        "*:data-[slot=dialog]:min-h-0 *:data-[slot=dialog]:flex-1 *:data-[slot=dialog]:flex-col",
        className
      )}
      showCloseButton={showCloseButton}
      isDismissable
      {...props}
    >
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {/*
        The search field consumes Escape to clear itself — it stops propagation, so the modal's
        own dismiss never fires and the footer's "Esc — Close" would be a lie. Catch it on the
        way *down* instead. `display: contents` keeps the dialog's flex chain unbroken.
      */}
      <div
        className="contents"
        onKeyDownCapture={(event) => {
          if (event.key === "Escape") {
            onOpenChange?.(false)
          }
        }}
      >
        {children}
      </div>
    </Dialog>
  )
}

function CommandInput({ className, ...props }: InputProps) {
  return (
    <SearchField
      autoFocus
      aria-label={props.placeholder || "Search"}
      data-slot="command-input-wrapper"
      className="relative px-2.5 py-1.5"
    >
      <InputGroup className="h-8! rounded-lg! border-transparent! bg-transparent! shadow-none! *:data-[slot=input-group-addon]:pl-1!">
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-80" />
        </InputGroupAddon>
        <Input
          {...props}
          data-slot="command-input"
          className={cn(
            "w-full text-sm outline-hidden placeholder:text-muted-foreground/72 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden",
            className
          )}
        />
      </InputGroup>
    </SearchField>
  )
}

/**
 * The result surface. It sits *on* the dialog's muted plate, bleeds past its side borders
 * (`-mx-px` plus the clip-path, which trims the left and right edges), and is the only part
 * of the palette that scrolls.
 */
function CommandPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-panel"
      className={cn(
        "relative -mx-px flex min-h-0 flex-1 flex-col rounded-t-xl border border-b-0 bg-popover bg-clip-padding shadow-xs [clip-path:inset(0_1px)]",
        className
      )}
      {...props}
    />
  )
}

/** The keyboard-hint strip. Sits on the muted plate, below the panel. */
function CommandFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-footer"
      className={cn(
        "relative flex items-center justify-between gap-2 rounded-b-[calc(var(--radius-2xl)-1px)] border-t px-5 py-3 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandList<T extends object>({ className, ...props }: MenuProps<T>) {
  return (
    <Menu
      {...props}
      data-slot="command-list"
      className={cn(
        "no-scrollbar min-h-0 flex-1 scroll-py-2 overflow-x-hidden overflow-y-auto outline-none not-empty:p-2",
        className
      )}
    />
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-empty"
      className={cn(
        "p-2 py-6 text-center text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandGroup<T extends object>({
  className,
  children,
  items,
  heading,
  ...props
}: MenuSectionProps<T> & { heading?: string }) {
  return (
    <MenuSection
      data-slot="command-group"
      className={cn(
        "text-foreground [[role=group]+&]:mt-1.5 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {heading && <Header cmdk-group-heading="">{heading}</Header>}
      <Collection items={items}>{children}</Collection>
    </MenuSection>
  )
}

function CommandSeparator({ className, ...props }: SeparatorProps) {
  return (
    <Separator
      data-slot="command-separator"
      className={cn("mx-2 my-2 h-px w-auto bg-border last:hidden", className)}
      {...props}
    />
  )
}

function CommandItem<T extends object>({
  className,
  children,
  textValue,
  ...props
}: MenuItemProps<T>) {
  return (
    <MenuItem
      {...props}
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none sm:min-h-7 data-focused:bg-accent data-focused:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-64 data-selected:bg-accent data-selected:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      textValue={
        textValue || (typeof children === "string" ? children : undefined)
      }
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
        </>
      ))}
    </MenuItem>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ms-auto font-sans text-xs font-medium tracking-widest text-muted-foreground/72 group-data-focused/command-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
  CommandShortcut,
}

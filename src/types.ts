import type { BasePayload, CollectionConfig, CollectionSlug } from 'payload'

export type MenuItemType = 'custom' | 'internal' | 'passive' | 'url'

export type FormData = {
  custom?: string
  internal?: string
  parent?: null | string
  passive?: string
  relationTo?: string
  title: string
  type: MenuItemType
  url?: string
}

export type NavigationAccess = {
  menuItem?: CollectionConfig['access']
  navigation?: CollectionConfig['access']
}

export type ResolveInternalUrl = (args: {
  collection: CollectionSlug
  id: string
  payload: BasePayload
}) => Promise<string>

export type NavigationPluginConfig = {
  access?: NavigationAccess
  disabled?: boolean
  internalCollections?: string[]
  maxDepth?: number
  resolveInternalUrl?: ResolveInternalUrl
}

export type Item = {
  [key: string]: unknown
  _order?: null | string
  collapsed?: boolean | null
  custom?: null | string
  depth?: null | number
  handle: string
  id: string
  internal?: {
    relationTo?: string
    value?: { id: string } | null | string
  } | null
  parent?: { id: string } | null | string
  passive?: null | string
  title: string
  type?: MenuItemType | null
  url?: null | string
  value?: null | string
}

export type Menu = {
  children?: Menu[]
} & Item

export type NavigationMenuItem = {
  children?: NavigationMenuItem[]
  collapsed?: boolean
  depth: number
  href: string
  id: string
  parent: null | string
  title: string
  type: string
}

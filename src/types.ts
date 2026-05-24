import type { BasePayload, CollectionConfig, CollectionSlug } from 'payload'

export type MenuItemType = 'custom' | 'internal' | 'passive' | 'url'

export type ID = string | number

export type ResolveInternalUrl = (args: {
  collection: CollectionSlug
  id: ID
  payload: BasePayload
}) => Promise<string>

export type NavigationPluginConfig = {
  disabled?: boolean
  internalCollections?: CollectionSlug[]
  maxDepth?: number
  menuItem?: Omit<Partial<CollectionConfig>, 'slug'>
  navigation?: Omit<Partial<CollectionConfig>, 'slug'>
  resolveInternalUrl?: ResolveInternalUrl
}

export type Item = {
  [key: string]: unknown
  _order?: null | string
  collapsed?: boolean | null
  custom?: null | string
  depth?: null | number
  href?: null | string
  id: ID
  internal?: {
    relationTo?: string
    value?: { id: ID } | null | string
  } | null
  navigation?: { id: ID } | null | string
  parent?: { id: ID } | null | string
  passive?: null | string
  title: string
  type?: MenuItemType | null
  url?: null | string
}

export type Menu = {
  children?: Menu[]
} & Item

export type NavigationMenuItem<TExtra extends Record<string, unknown> = Record<string, never>> = {
  children?: NavigationMenuItem<TExtra>[]
  collapsed?: boolean
  depth: number
  href: string
  id: ID
  parent: null | ID
  title: string
  type: string
} & TExtra

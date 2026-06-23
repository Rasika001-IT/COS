import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import styles from './Card.module.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Dark hero card (check-in card / avatar surface). */
  dark?: boolean
  /** Tighter mobile radius. */
  mobile?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ dark, mobile, padding = 'md', className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        styles.card,
        dark && styles.dark,
        mobile && styles.mobile,
        styles[`pad_${padding}`],
        className,
      )}
      {...rest}
    />
  )
}

import { cn } from '@/lib/cn'
import styles from './Skeleton.module.css'

export interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
}

export function Skeleton({ width = '100%', height = 16, radius = 8, className }: SkeletonProps) {
  return <span className={cn(styles.skeleton, className)} style={{ width, height, borderRadius: radius }} aria-hidden />
}

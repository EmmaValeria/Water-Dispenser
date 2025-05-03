import type { ReactNode } from 'react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

interface CardProps {
  children: ReactNode
  className?: string
}

export function CardHeader ({ children, className = '' }: CardProps): React.ReactElement {
  const baseStyles = 'flex flex-col space-y-1.5 p-6'
  return <header className={twMerge(baseStyles, className)}>{children}</header>
}

export function CardTitle ({ children, className = '' }: CardProps): React.ReactElement {
  const baseStyles = 'font-semibold leading-none tracking-tight text-lg'
  return <h3 className={twMerge(baseStyles, className)}>{children}</h3>
}

export function CardDescription ({ children }: CardProps): React.ReactElement {
  return <p className='text-sm text-slate-500'>{children}</p>
}

export function CardContent ({ children, className }: CardProps): React.ReactElement {
  const baseStyles = 'p-6 pt-0'
  return <main className={twMerge(baseStyles, className)}>{children}</main>
}

export function CardFooter ({ children }: CardProps): React.ReactElement {
  return <footer className='p-6 pt-0'>{children}</footer>
}

export function Card ({ children, className = '' }: CardProps): React.ReactElement {
  const baseStyles = 'h-fit rounded-xl border border-slate-500/20 bg-transparent shadow w-[350px]'

  return (
    <section className={twMerge(clsx(baseStyles, className))}>
      {children}
    </section>
  )
}

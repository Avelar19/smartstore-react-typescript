import { NavLink } from 'react-router-dom'

import type { NavigationItem } from '../routes/navigation.ts'
import classes from './NavigationLinks.module.css'

interface NavigationLinksProps {
  items: readonly NavigationItem[]
  orientation: 'horizontal' | 'vertical'
  /** Rótulo acessível do bloco de navegação. */
  label: string
  onNavigate?: () => void
}

export function NavigationLinks({ items, orientation, label, onNavigate }: NavigationLinksProps) {
  return (
    <nav aria-label={label}>
      <div className={`${classes.list} ${classes[orientation]}`}>
        {items.map(({ label: itemLabel, to, icon: ItemIcon, end }) => (
          <NavLink key={to} to={to} end={end ?? false} className={classes.link ?? ''} onClick={onNavigate}>
            <ItemIcon size={18} stroke={1.6} aria-hidden />
            <span>{itemLabel}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

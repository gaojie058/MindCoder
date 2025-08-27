type ButtonProps = {
  children: React.ReactNode,
  color?:'shallow' | 'deep',
  onClick:()=>void
  // ... other props
  className?: string,

}


export default function Button({ color = 'shallow', className,children,onClick}:ButtonProps) {
  
  return (
    <div className={ ` ${color === 'deep' ? 'bg-deepbg' : 'bg-shallowbg'} flex items-center justify-center  text-white text-center cursor-pointer  ${className}` } onClick={onClick} >
      {children}
    </div>
  )
}

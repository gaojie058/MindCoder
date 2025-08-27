import { AlertCircle,Terminal } from "lucide-react"
import {useGSAP} from '@gsap/react'
import gsap from "gsap"
import { createPortal} from "react-dom"
import {createRoot} from 'react-dom/client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { useEffect, useRef, useState } from "react"


type parameter = {
  type?: 'default' | 'destructive',
  message: string,
  title: string
  duration?:number
}

type alertProps = {
  variant?:'default'| 'destructive',
  title:string,
  message:string,
  container:HTMLDivElement,
  duration:number
}

const AlertComponents = ({variant = 'default',title,message,container,duration}:alertProps)=>{

  const [isShow,setIsShow] = useState(true)
  
  const element = useRef<HTMLDivElement>(null)
  
  useGSAP(()=>{
  
    const timeline = gsap.timeline()

    timeline.from(element.current,{
      opacity:0,
      scale:0,
      duration:duration*0.2/1000,
      // top:0,
      ease:'back.out'
    })
    timeline.to(element.current,{
      delay:duration*0.6/1000,
      opacity:0,
      scale:0,
      duration:duration*0.2/1000,
      // top:0,
      ease:'power3.in'
    })
  })
  
  useEffect(()=>{
    const timer = setTimeout(()=>{
      setIsShow(false)
    },duration)
    return ()=>{
      clearTimeout(timer)
      document.body.removeChild(container)
    }
  },[container,duration])

  if(!isShow){
    return null
  }

  return (
    createPortal(<Alert variant={variant} ref={element}  className=" fixed top-2 left-1/2 -translate-x-1/2 w-96 z-50 bg-white " >
      {variant === 'default' ? <Terminal className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>,container)
  )
}



const AlertInfo = ({ type = 'default', message, title ,duration = 2000}: parameter) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  root.render(
    <AlertComponents variant={type}  title={title} message={message} container={container} duration={duration} />
  )
}

export default AlertInfo;
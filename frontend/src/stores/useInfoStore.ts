import { create } from 'zustand'
import {infoStore} from '@/types'


const useInfoStore = create<infoStore>((set)=>({
  nickname:'',
  projectname:'',
  setNickname(value) {
      set(() => ({
          nickname: value,
      }))
  },
  setProjectname(value) {
      set(() => ({
          projectname: value,
      }))
  }
}))

export default useInfoStore
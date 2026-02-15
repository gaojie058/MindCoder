import { create } from 'zustand'
import {infoStore} from '@/types'


const useInfoStore = create<infoStore>((set)=>({
  nickname:'',
  projectname:'',
  model: 'gpt-5-2025-08-07',
  selectedSteps: ['card', 'code', 'concept', 'display'],
  setNickname(value) {
      set(() => ({
          nickname: value,
      }))
  },
  setProjectname(value) {
      set(() => ({
          projectname: value,
      }))
  },
  setModel(value) {
      set(() => ({
          model: value,
      }))
  },
  setSelectedSteps(value) {
      set(() => ({
          selectedSteps: value,
      }))
  },
}))

export default useInfoStore

import { Text, SafeAreaView, Image, ScrollView, TouchableOpacity } from 'react-native'
import { Camera } from 'expo-camera'
import { useEffect, useRef, useState } from 'react'
import * as FileSystem from 'expo-file-system'
import axios from 'axios'
import { Buffer } from 'buffer'
import { Audio } from 'expo-av'
// import useStateWithCallback from './useStateWithCallBack'

export default function App() {
  const [hasCamera, setHasCamera] = useState(null)
  const cameraRef = useRef(null)
  const [text, setText] = useState('Object Label')
  const [status, setStatus] = useState(false)
  const [detectObject, setDetectObject] = useState({
    x: 0,
    y: 0,
    name: '',
    id: 0,
  })
  const threshold = .5
  const hindeObjects = [
    'brick',
    'wall',
    'pole',
    'brickwall',
    'vehicle',
    'car',
    'wooden',
    'laptop',
    'couch',
    'computer keyboard',
    'dining table',
    'chair',
    'cell phone',
    'book',
    'kitchen appliance',
    'luggage and bags',
    'person',
  ]

  /* eslint-disable global-require */
  /* eslint-disable no-promise-executor-return */
  const playHighSound = async () => {
    try {
      const sound = new Audio.Sound()
      await sound.loadAsync(require('./assets/warn.mp3'))
      await sound.setStatusAsync({ shouldPlay: true, volume: 1.0 })
      // await new Promise((resolve) => setTimeout(resolve, 1000))
      // await sound.unloadAsync()
    } catch (error) {
      setText(`Error ${error}`)
    }
  }
  const warnPerson = async () => {
    try {
      const sound = new Audio.Sound()
      await sound.loadAsync(require('./assets/person.mp3'))
      await sound.setStatusAsync({ shouldPlay: true, volume: 1.0 })
      // await new Promise((resolve) => setTimeout(resolve, 1000))
      // await sound.unloadAsync()
    } catch (error) {
      setText(`Error ${error}`)
    }
  }

  const playLowSound = async () => {
    try {
      const sound = new Audio.Sound()
      await sound.loadAsync(require('./assets/warn.mp3'))
      await sound.setStatusAsync({ shouldPlay: true, volume: 0.1 })
      // await new Promise((resolve) => setTimeout(resolve, 1000))
      // await sound.unloadAsync()
    } catch (error) {
      setText(`Error ${error}`)
    }
  }

  useEffect(() => {
    ;(async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync()
      setHasCamera(cameraStatus.status === 'granted')
    })()
  }, [])

  if (hasCamera === false) {
    return <Text> No access to camera </Text>
  }

  // eslint-ignore-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const decodeImage = async (imageBinaryData) => {
      try {
        const res = await axios.post(process.env.EXPO_PUBLIC_API_URL, imageBinaryData, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': process.env.EXPO_PUBLIC_API_KEY,
          },
        })
        const rawObjects = res.data.objectsResult.values
        const totalHeight = res.data.metadata.height
        const totalWidth = res.data.metadata.width

        const objects = rawObjects.filter((item) =>
          hindeObjects.includes(item.tags[0].name.toLowerCase())
        )
        if (objects.length > 0) {
          const objectName = objects[0].tags[0].name.toLowerCase()
          const area = objects[0].boundingBox.h * objects[0].boundingBox.w
          const h = objects[0].boundingBox.h
          const w = objects[0].boundingBox.w
          setDetectObject({ x: w, y: h, name: objectName, id: status.id + 1 })
          setText(`Objects: ${objectName}`)
          if (objectName === 'person') {
            await warnPerson()
          } else if (
            area > threshold * totalHeight * totalWidth ||
            h > threshold * totalHeight ||
            w > threshold * totalWidth
          ) {
            await playHighSound()
          } else {
            await playLowSound()
          }
          // setHinder(objectName)
        } else {
          setText('No Warning Objects Detected')
          setDetectObject({ ...status, id: status.id + 1 })
        }
      } catch (error) {
        setText(`Error: ${error}`)
      }
    }

    const startDetect = async () => {
      // setText('Processing...')
      if (cameraRef) {
        try {
          const data = await cameraRef.current.takePictureAsync({
            skipProcessing: true,
          })
          const imageBinaryData = await FileSystem.readAsStringAsync(data.uri, {
            encoding: FileSystem.EncodingType.Base64,
          })
          const binary = Buffer.from(imageBinaryData, 'base64')
          await decodeImage(binary)
        } catch (e) {
          setText(`Error: ${e}`)
        }
      }
    }
    if (status) startDetect()
  }, [status, detectObject, text])

  const handleStartClick = () => {
    setStatus(true)
    setDetectObject({ x: 0, y: 0, name: '', id: 0 })
  }

  return (
    <SafeAreaView className='flex-1 bg-gray-100 relative pt-20'>
      <ScrollView>
        <Image source={require('./assets/logo.jpg')} className='w-full h-40' />
        <Camera
          className='w-full h-64'
          type={Camera.Constants.Type.back}
          flashMode={Camera.Constants.FlashMode.off}
          ref={cameraRef}
        />
        <Text className='text-gray-700 text-center py-10 bg-slate-200'>{text}</Text>
        <TouchableOpacity className='p-2 pt-5 m-auto w-1/2' onPress={handleStartClick}>
          <Text className='bg-blue-500 text-center text-white p-2 rounded-xl'>Start Detect</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className='p-2 mt-2 m-auto w-1/2'
          onPress={() => {
            setStatus(false)
          }}
        >
          <Text className='bg-rose-500 text-center text-white p-2 rounded-xl'>Stop Detect</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

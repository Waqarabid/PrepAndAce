// ** React Imports
import { createContext, useEffect, useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'
import { API_URL } from 'src/configs'

// ** Axios
import { axios, axios2 } from 'src/configs'

import { decUserData, encUserData } from 'src/@core/utils'
import { toast } from 'react-hot-toast'
import { deleteAllCookies } from 'src/configs/services/constant'

// ** Defaults
const defaultProvider = {
  user: null,
  loading: false,
  setUser: () => null,
  setLoading: () => Boolean,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve()

  //register: () => Promise.resolve()
}
const AuthContext = createContext(defaultProvider)

const AuthProvider = ({ children }) => {
  // ** States
  const [user, setUser] = useState(defaultProvider.user)
  const [loading, setLoading] = useState(defaultProvider.loading)
  const requestTimeout = 25000
  const [keyUpTime, setKeyUpTime] = useState(Date())

  // ** Hooks
  const router = useRouter()

  const initAuth = async () => {
    console.log('1')
    const data = decUserData(window.localStorage.getItem('userData'))
    console.log('2')
    let userData = data && JSON.parse(data)
    console.log('3', userData)
    if (userData) {
      console.log('4')

      //setLoading(false)
      setLoading(true)
      await axios
        .get(
          `${process.env.NEXT_PUBLIC_BASEURL_LOCAL}/api/auth?token=${userData.token}&refreshToken=${userData.refreshToken}`,
          { timeout: requestTimeout }
        )
        .then(async response => {
          console.log('4')
          setLoading(false)
          setUser(userData)
          console.log('5')
          const data = response.data
          console.log('6')

          if (data.token) {
            console.log('7')
            userData = { ...userData, token: data.token }
          } else {
            handleLogout()
            toast.error('0 Session has been expired, Please Re-login', {
              position: 'top-center',
              style: { padding: 10, fontSize: 24, minWidth: 200 },
              duration: 10000
            })

            return
          }
        })
        .catch(err => {
          console.log('err', err)
          toast.error('1 Session has been expired, Please Re-login', {
            position: 'top-center',
            style: { padding: 10, fontSize: 24, minWidth: 200 },
            duration: 10000
          })
          const _data = decUserData(window.localStorage.getItem('userData'))
 
          setLoading(false)
          setUser(_data)
          //handleLogout()
        })
    } else {
      setLoading(false)

      //handleLogout()
    }
  }
  useEffect(() => {
    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetTimer() {
    {
      const newkeyUpTime = new Date(keyUpTime)
      const date = new Date()

      //if Minutes > 60 then set current time
      if (newkeyUpTime.getMinutes() + 25 >= 60) {
        setKeyUpTime(Date())
      }
      if (date.getHours() != newkeyUpTime.getHours() && date.getMinutes() >= newkeyUpTime.getMinutes() + 25) {
        console.log('Call Auth')
        initAuth()
        setKeyUpTime(Date())
      }
    }
  }

  // Add event listeners to reset the timer on user activity

  useEffect(() => {
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keypress', resetTimer)
    window.addEventListener('touchstart', resetTimer)

    //   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyUpTime])

  const handleLogin = async (params, errorCallback) => {
    // const apiresp = await axios2.get('client-info')
    axios
      .post(
        `${process.env.NEXT_PUBLIC_BASEURL_LOCAL}api/auth`,
        {
          user_name: params.username,
          password: params.password,
          user_type: params.username.includes('@') ? 'S' : 'A'
        },
        { timeout: requestTimeout }
      )
      .then(async response => {
        if (!response.data) {
          toast.error('Something went wrong')

          return
        }

        const data = {
          compcode: response?.data?.compcode,
          id: response?.data?.user_id,
          user_type: response?.data?.user_type,
          fullName: response?.data?.user_full_name,
          email: response?.data?.email_id,
          token: response?.data?.token,
          refreshToken: response?.data?.refreshToken,
          ip: '', //apiresp.data?.address,
          browser: '' //apiresp?.data.browser
        }
        const returnUrl = router.query.returnUrl

        setUser({ ...data })
        const encData = encUserData(data)
        params.rememberMe ? window.localStorage.setItem('userData', encData) : null
        const redirectURL = returnUrl && returnUrl !== '/' ? returnUrl : '/'

        // router.replace(redirectURL)
        router.replace('/mycourses/list')
        initAuth()
      })
      .catch(err => {
        if (errorCallback) errorCallback(err)

        if (err.code === 'ECONNABORTED') {
          toast.error('Connection Timeout, Server Not Responding ')
        } else {
          if (!err.toString().includes('compcode')) {
            toast.error(err.message)
          }
        }

        // handleLogout()
      })
  }

  const handleLogout = () => {
    setUser(null)
    window.localStorage.removeItem('userData')
    deleteAllCookies()
    router.push('/home')
  }

  // const handleRegister = (params, errorCallback) => {
  //   axios
  //     .post(authConfig.registerEndpoint, params)
  //     .then(res => {
  //       if (res.data.error) {
  //         if (errorCallback) errorCallback(res.data.error)
  //       } else {
  //         handleLogin({ email: params.email, password: params.password })
  //       }
  //     })
  //     .catch(err => (errorCallback ? errorCallback(err) : null))
  // }

  const values = {
    user,
    loading,
    setUser,
    setLoading,
    login: handleLogin,
    logout: handleLogout

    //register: handleRegister
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }

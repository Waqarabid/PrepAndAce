import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { resolve } from 'styled-jsx/css'

const KEY = process.env.NEXT_PUBLIC_CURRENCY_API_KEY
const tokenExpiry = process.env.NEXT_PUBLIC_TOKEN_EXPIRY

const addUserSession = async body => {
  const client = new MongoClient(process.env.NEXT_PUBLIC_MONGO_URI)
  await client.connect()
  const db = client.db()
  await db.collection('user_session').deleteOne({ user_id: body.user_id })
  await db.collection('user_session').insertOne(body)
  await client.close()
}

const VerifyToken = async data => {
  const client = new MongoClient(process.env.NEXT_PUBLIC_MONGO_URI)
  await client.connect()
  const db = client.db()

  const result = await db.collection('user_session').find(data).toArray()
  await client.close()

  return result
}

const generateRefreshToken = () => {
  let str = process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY
  let Key = ''

  for (let i = 1; i <= 50; i++) {
    let char = Math.floor(Math.random(9999) * str.length + 1)

    Key += str.charAt(char)
  }

  return Key
}

export default async function handler(req, res) {
  const client = new MongoClient(process.env.NEXT_PUBLIC_MONGO_URI)

  await client.connect()
  const db = client.db('WA')
  console.log('db', db)
  let result = []
  let reg = []
  const { method } = req
  const { user_name, password, user_type } = req.body
  try {
    switch (method) {
      case 'POST':
        {
          /* Any how email or password is blank */
          if (!user_name || !password || !user_type) {
            return res.status(400).json({
              status: 'error',
              error: 'Request missing username or password'
            })
          }
          console.log('user_name, password, user_type', user_name, password, user_type)
          result = await db.collection('users').find({ user_name, password, user_type, active: 'true' }).toArray()
          console.log('result', result)

          /* Check user email in database */
          const user = result[0]

          /* Check if exists */
          if (!user) {
            /* Send error with message */
            res.status(400).json({ status: 'error', error: 'User Not Found' })
          }

          /* Variables checking */
          if (user) {
            if (user_type === 'S') {
              reg = await db.collection('registration').find({ student_id: result[0].student_id }).toArray()
            }

            const userId = user.user_id,
              userEmail = user.user_name,
              userPassword = user.password

            /* Create JWT Payload */
            const payload = {
              userId,
              email: userEmail
            }

            /* Sign token */
            jwt.sign(
              payload,
              KEY,
              {
                expiresIn: 3600 // 1 Hour in seconds
              },
              (err, token) => {
                const refreshToken = generateRefreshToken()
                let expiryTime = new Date()

                expiryTime.setTime(expiryTime.getTime() + parseInt(tokenExpiry) * 60 * 60 * 1000)
                expiryTime = expiryTime

                const user_session_body = {
                  user_id: userId,
                  refreshToken,
                  expiryTime,
                  dateTime: new Date()
                }

                addUserSession(user_session_body)

                /* Send success with token */
                res.status(200).json({
                  token: token,
                  refreshToken,
                  compcode: 1,
                  user_id: user.user_id,
                  user_full_name: user_type === 'S' ? reg[0].student_first_name : user.user_name,
                  email_id: userEmail
                })
              }
            )
          }
        }
        break

      case 'GET':
        {
          try {
            const reqData = Object.keys(req?.body).length > 0 ? req.body : req.query
            const { token, refreshToken } = reqData

            const verifyToken = jwt.verify(token, KEY)
            const data = await VerifyToken({ refreshToken, user_id: verifyToken.userId })

            const { dateTime, expiryTime } = data[0]
            const currentDate = Date()

            // console.log('currentDate', currentDate)
            // console.log('dateTime', new Date(dateTime))
            // console.log('expiryTime', new Date(expiryTime))
            const isValid = true //Date(dateTime) < new Date(currentDate) && new Date(currentDate) < new Date(expiryTime)
            console.log('verifyToken', isValid)
            if (verifyToken.userId && isValid) {
              const payload = {
                userId: verifyToken.userId,
                email: verifyToken.email
              }

              /* Sign token */
              jwt.sign(
                payload,
                KEY,
                {
                  expiresIn: 3600 // 1 Hour in seconds
                },
                async (err, token) => {
                  //const refreshToken = generateRefreshToken()
                  let expiryTime = new Date()

                  expiryTime.setTime(expiryTime.getTime() + parseInt(tokenExpiry) * 60 * 60 * 1000)
                  expiryTime = expiryTime

                  const user_session_body = {
                    user_id: verifyToken.userId,
                    refreshToken,
                    expiryTime,
                    dateTime: new Date()
                  }

                  addUserSession(user_session_body)

                  /* Send success with token */
                  res.status(200).json({
                    token: token,
                    refreshToken
                  })
                }
              )
            } else {
              res.status(401).json({ error: 'Unauthorized!' })
            }
          } catch (error) {
            res.status(401).json({ error: 'Unauthorized!' })
          }
        }
        break
      default:
        res.status(405).json({ error: 'Unsupported HTTP method' })
    }
  } catch (error) {
    throw error
  }
  await client.close()

  return resolve()
}

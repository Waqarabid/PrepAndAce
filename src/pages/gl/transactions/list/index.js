import { useState, useEffect } from 'react'
import { Card, CardHeader, Box, IconButton, Grid, Tooltip } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import DataGridHeaderToolbar from 'src/views/table/data-grid/DataGridHeaderToolbar'
import Icon from 'src/@core/components/icon'
import { getGLTransactions } from 'src/store'
import { toast } from 'react-hot-toast'
import { columns } from 'src/views/pages/gl/transactions/static-data'
import { amountWithComma, dateconvert, handleSearch, isAllowed, setRedirectUrl } from 'src/@core/utils'
import { print } from 'src/@core/utils'
import usePermission from 'src/@core/hooks/usePermission'
import Link from 'next/link'
import { useRouter } from 'next/router'

const pageTitle = 'GL Transactions'

const TransactionsList = () => {
  const permissions = usePermission()
  const { push } = useRouter()

  const [states, setStates] = useState({
    pageSize: 5,
    data: []
  })

  const [searchStates, setSearchStates] = useState({ searchText: '', filteredData: [] })

  const fillGrid = async () => {
    const response = await getGLTransactions()

    if (response?.error) {
      toast.error(response.error.message)

      return
    }
    if (response?.items.length > 0) {
      const data = response.items

      let helper = {}

      const reducedData = data.reduce((prev, curr) => {
        const key = curr.vcode + '-' + curr.vno

        if (!helper[key]) {
          helper[key] = Object.assign({}, curr) // create a copy of o
          prev.push(helper[key])
        } else {
          helper[key].amountdr += curr.amountdr
          helper[key].amountcr += curr.amountcr
        }

        return prev
      }, [])

      setStates({ ...states, data: reducedData, pageSize: 5 })
    }
  }

  useEffect(() => {
    fillGrid()
  }, [])

  const handleRefresh = () => {
    setSearchStates({ searchText: '', filteredData: [] })
    fillGrid()
  }

  const updateColumns =
    isAllowed(permissions, 'U') || isAllowed(permissions, 'D')
      ? [
          ...columns,
          {
            sortable: false,
            filterable: false,
            editable: false,
            disableColumnMenu: false,
            flex: 1,
            minWidth: 100,
            align: 'right',
            headerAlign: 'right',
            headerName: 'Action',
            renderCell: ({ row }) => {
              return (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'row' }}>
                  {isAllowed(permissions, 'R') && (
                    <Tooltip title='Detail' placement='top'>
                      <IconButton size='small'>
                        <Link
                          href={setRedirectUrl({
                            url: '/gl/transactions/form',
                            data: { vcode: row.vcode, vno: row.vno }
                          })}
                        >
                          <Icon icon='tabler:external-link' />
                        </Link>
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )
            }
          }
        ]
      : columns

  const dataList = searchStates.filteredData?.length ? searchStates.filteredData : states?.data

  const exportDataList = dataList?.map(item => ({
    'V Code': item.vcode,
    'V Name': item.vname,
    'V No': item.vno,
    'V Date': dateconvert(item.vdate),
    Status: item.post === 'Y' ? 'Posted' : 'Unposted',
    'V Desc': item.vdesc1 || '',
    'S No': item.sno,
    Debit: amountWithComma(item.amountdr),
    Credit: amountWithComma(item.amountcr)
  }))

  return (
    <>
      <Grid container spacing={6.5}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title={pageTitle} />
            <DataGrid
              rows={dataList ?? []}
              pageSize={states.pageSize}
              rowsPerPageOptions={[5, 10, 25, 50]}
              components={{ Toolbar: DataGridHeaderToolbar }}
              onPageSizeChange={newPageSize => setStates({ ...states, pageSize: newPageSize })}
              componentsProps={{
                baseButton: {
                  variant: 'outlined'
                },
                toolbar: {
                  onClick: () => push('/gl/transactions/form'),
                  onChange: event => handleSearch({ value: event.target.value, data: states?.data, setSearchStates }),
                  onPrint: () =>
                    print({
                      title: pageTitle,
                      data: exportDataList
                    }),
                  onRefresh: handleRefresh,
                  clearSearch: () => handleSearch({ value: '', data: states?.data, setSearchStates }),
                  exportTitle: pageTitle,
                  exportData: exportDataList,
                  columns,
                  value: searchStates.searchText,
                  permissions: { C: isAllowed(permissions, 'C'), E: isAllowed(permissions, 'E') }
                }
              }}
              autoHeight
              rowHeight={32}
              getRowId={row => `${row.vcode}${row.vno}`}
              columns={updateColumns}
              disableSelectionOnClick
            />
          </Card>
        </Grid>
      </Grid>
    </>
  )
}

export default TransactionsList

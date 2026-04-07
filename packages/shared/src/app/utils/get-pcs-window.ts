export const getPcsWindow = (dateString: string | Date): string => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() // 0-11
  const quarter = Math.floor(month / 3) + 1
  return `${year}-Q${quarter}`
}

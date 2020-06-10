var url_base
module.exports = {
    init: (_url_base) => {
        url_base = _url_base
    },
    enrich: (path, index) => {
        return item => {
            item.href = url_base + path + '/' + item[index]
            return item
        }
    }
}
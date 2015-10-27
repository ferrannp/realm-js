/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#include "list.hpp"
#import <stdexcept>

using namespace realm;

size_t List::size() {
    return m_link_view->size();
}

Row List::get(std::size_t row_ndx) {
    verify_valid_row(row_ndx);
    return m_link_view->get(row_ndx);
}

void List::set(std::size_t row_ndx, std::size_t target_row_ndx) {
    verify_valid_row(row_ndx);
    m_link_view->set(row_ndx, target_row_ndx);
}

void List::verify_valid_row(std::size_t row_ndx) {
    size_t size = m_link_view->size();
    if (row_ndx >= size) {
        throw std::out_of_range(std::string("Index ") + std::to_string(row_ndx) + " is outside of range 0..." + std::to_string(size) + ".");
    }
}

void List::verify_attached() {
    if (!m_link_view->is_attached()) {
        throw std::runtime_error("Tableview is not attached");
    }
    m_link_view->sync_if_needed();
}

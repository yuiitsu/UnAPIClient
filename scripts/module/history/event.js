/**
 * 历史记录的事件监听
 * Created by Yuiitsu on 2018/05/21.
 */
Event.extend('history', function() {
    /**
     * 事件
      * @type {{select_host_to_search: event.select_host_to_search, history_switch: event.history_switch, list_control: event.list_control, tips_control: event.tips_control, search: event.search, group_tab: event.group_tab}}
     */
    this.event = {
        /**
         * 选择host检索history
         */
        select_host_to_search: function() {
            $('#history-content').on('click', '#history-sidebar li span', function(e) {
                let host = $(this).parent().attr('data-host');
                host = host ? host : '';
                //$('#history-host').find('li').removeClass('focus');
                $('.history-host').find('li').removeClass('focus');
                $(this).parent().addClass('focus');
                App.history.build_ui_list(null, host);
                e.stopPropagation();
            });
        },

        /**
         * host hover
         */
        host_hover: function() {
            $('#history-content').on('mouseover', '#history-sidebar li', function(e) {
                let host = $(this).attr('data-host');
                if (!host) {
                    return false;
                }

                let item_menu_html = View.get_view('history', 'host_item_menu', {'host': host});
                App.common.tips.show($(this), item_menu_html, {position: 'right'});
                e.stopPropagation();
            });
        },

        host_delete: function() {
            $('body').on('click', '.history-del', function(e) {
                let host = $(this).attr('data-host');
                if (!host) {
                    return false;
                }

                App.common.dialog().confirm('Confirm to delete the host', function() {
                    App.history.del_host(host);
                });
                e.stopPropagation();
            });
        },

        /**
         * history侧边栏开关
         */
        history_switch: function() {
            $('#history-content').on('click', '#history-switch-button', function() {
                let target = $('#history-sidebar');
                if (target.css('display') === 'flex') {
                    target.hide();
                    $(this).attr('title', 'Open the sidebar').find('i').addClass('mdi-chevron-right');
                } else {
                    target.show();
                    $(this).attr('title', 'Hide the sidebar').find('i').removeClass('mdi-chevron-right hover');
                }
            }).on('mouseover', '#history-switch-button', function() {
                $(this).find('i').addClass('hover');
            }).on('mouseout', '#history-switch-button', function() {
                $(this).find('i').removeClass('hover');
            });
        },

        /**
         * 打开一个history
         */
        history_item_select: function() {
            $('#history-content').on('click', '#history-list-box tr', function(e) {
                // 选中数据
                let key = $(this).attr('data-key');
                // 从缓存中获取数据
                let historyData = App.history.getData();
                if (historyData[key]) {
                    let url = historyData[key]['url'],
                        requestType = historyData[key]['type'],
                        form_data_type = historyData[key]['data_type'],
                        headers = historyData[key]['headers'],
                        data = historyData[key]['data'],
                        response_content_type = historyData[key]['response_content_type'],
                        result = historyData[key]['result'],
                        apiName = historyData[key]['name'],
                        time = historyData[key]['time'],
                        group_id = historyData[key]['group_id'],
                        status = historyData[key]['status'];

                    $('#request-type').val(requestType);
                    $('#url').val(url);
                    $('#response-headers').html(headers ? headers : '');
                    $('#api-name').val(apiName);
                    $('#send-time').html(time);
                    $('#response-status').html(status);
                    $('.tabs li').eq(1).trigger('click');

                    App.common.display_response(result, response_content_type);
                    App.requestType = requestType;

                    // 显示参数
                    $('input[name=form-data-type]').each(function() {
                        if ($(this).val() === form_data_type) {
                            $(this).trigger('click');
                        }
                    });

                    let raw_obj = $('#form-data-raw').find('textarea');
                    switch (form_data_type) {
                        case "form-data":
                            View.display('form', 'urlencoded_line', data, '#form-data');
                            View.display('form', 'form_data_line', [], '#form-data-true');
                            raw_obj.val('');
                            break;
                        case "form-data-true":
                            View.display('form', 'urlencoded_line', [], '#form-data');
                            View.display('form', 'form_data_line', data, '#form-data-true');
                            raw_obj.val('');
                            break;
                        case "raw":
                            raw_obj.val(data);
                            break;
                        default:
                            console.log('form-data-type error');
                            break;
                    }

                    // assert
                    let assert_data = App.history.get_assert_data(),
                        assert_content = '';
                    if (assert_data.hasOwnProperty(key)) {
                        let assert_type = assert_data[key]['type'];
                        assert_content = assert_data[key]['content'];
                        if (assert_type) {
                            $('input[name=form-data-assert-type]').attr('checked', false).each(function() {
                                let value = $(this).val();
                                if (value === assert_type) {
                                    $(this).prop('checked', 'checked');
                                }
                            });
                        }
                    }

                    $('#form-data-assert').text(assert_content);

                    // group_id下拉菜单
                    // App.group.display_selector(group_id);
                }
                e.stopPropagation();
            });
        },

        open_all_action: function() {
            $('#history-content').on('mouseover', '.history-all-action', function(e) {
                App.common.tips.show($(this), View.get_view('history', 'history_all_action_menu', {}));
                e.stopPropagation();
            })
        },

        open_item_menu: function() {
            $('#history-content').on('mouseover', '#history-list-box tbody td.history-item-action', function(e) {
                let key = $(this).attr('data-key');
                App.common.tips.show($(this), View.get_view('history', 'history_item_menu', {
                    key: key,
                    selected_object: App.selected_object
                }));
                e.stopPropagation();
            });
        },

        /**
         * 拖拽
         */
        drag: function() {
            let is_mouse_down = false,
                selected_history_key = '',
                source_object = null;

            let body_mouse_up_event = {
                on: function() {
                    $('body').off('mouseup').on('mouseup', function(e) {
                        if (source_object) {
                            source_object.removeClass('opacity-3');
                        }
                        source_object = null;
                        is_mouse_down = false;
                        selected_history_key = '';
                        //e.stopPropagation();
                    });
                },
                off: function() {
                    $('body').off('mouseup');
                }
            };

            $('#history-content').on('mousedown', '#history-list-box tr', function(e) {
                let history_key = $(this).attr('data-key');
                is_mouse_down = true;
                selected_history_key = history_key;
                source_object = $(this);
                e.stopPropagation();
            }).on('mousemove', function() {
                if(is_mouse_down) {
                    if (source_object) {
                        source_object.addClass('opacity-3');
                    }
                }
                // e.stopPropagation();
            }).on('mousemove', '#history-list-box tr', function(e) {
                if(!is_mouse_down) {
                    return false;
                }

                let target_top = $(this).offset().top,
                    target_height = $(this).outerHeight(),
                    data_key = $(this).attr('data-key');

                if (data_key !== source_object.attr('data-key')) {

                    if (e.clientY > target_top + target_height / 2) {
                        if ($(this).index() !== source_object.index() - 1) {
                            if ($('#history-drag-mask').length === 0) {
                                $(this).after(View.get_view('history', 'drag_mask_line', {
                                    'key': data_key,
                                    'position': 'next'
                                }));
                            } else if ($('#history-drag-mask').length > 0 && $('#history-drag-mask').attr('data-key') !== data_key) {
                                $('#history-drag-mask').remove();
                                $(this).after(View.get_view('history', 'drag_mask_line', {
                                    'key': data_key,
                                    'position': 'next'
                                }));
                            }
                        }
                    }

                    if (e.clientY > target_top && e.clientY < target_top + target_height / 2) {
                        if ($(this).index() !== source_object.index() + 1) {
                            if ($('#history-drag-mask').length === 0) {
                                $(this).before(View.get_view('history', 'drag_mask_line', {
                                    'key': data_key,
                                    'position': 'pre'
                                }));
                            } else if ($('#history-drag-mask').length > 0 && $('#history-drag-mask').attr('data-key') !== data_key) {
                                $('#history-drag-mask').remove();
                                $(this).before(View.get_view('history', 'drag_mask_line', {
                                    'key': data_key,
                                    'position': 'pre'
                                }));
                            }
                        }
                    }
                }
            }).on('mouseleave', '#history-list-box', function(e) {
                if(!is_mouse_down) {
                    return false;
                }
                $('#history-drag-mask').remove();
                e.stopPropagation();
            }).on('mouseup', '#history-list-box tr', function(e) {
                if(!is_mouse_down) {
                    return false;
                }

                if($('#history-drag-mask').length === 0) {
                    return false;
                }
                let target = $('#history-drag-mask');
                let source_data_key = source_object.attr('data-key'),
                    source_html = source_object.prop('outerHTML'),
                    target_data_key = target.attr('data-drag-key'),
                    target_position = target.attr('data-position');

                if (!target_data_key || !target_position) {
                    return false;
                }

                App.history.move_position(null, source_data_key, target_data_key, target_position);

                target.replaceWith(source_html);
                source_object.remove();
                $('#history-list-box tr').removeClass('opacity-3');
            });

            $('#history-group').on('mouseup', '.history-group-item', function(e) {
                let group_id = $(this).attr('data-group-id');
                if (is_mouse_down && selected_history_key) {
                    App.group.add_history(group_id, selected_history_key);
                }
                is_mouse_down = false;
                selected_history_key = '';
                $('#history-list-box tr').removeClass('opacity-3');
            }).on('mouseenter', '#history-group-ul', function(e) {
                body_mouse_up_event.off();
            }).on('mouseleave', '#history-group-ul', function(e) {
                body_mouse_up_event.on();
            });

            body_mouse_up_event.on();
        },

        /**
         * 从分组移除
         */
        remove_from_group: function() {
            $('body').on('click', '.history-tips-add-list li.remove-from-group', function(e) {
                let key = $(this).parent().attr('data-key');
                App.group.remove_history(key);
                App.common.tips.remove();
                e.stopPropagation();
            });
        },

        /**
         * 打开加入分组界面
         */
        add_to_group_form: function() {
            $('body').on('click', '.history-tips-add-list li.add-to-group', function(e) {
                let key = $(this).parent().attr('data-key');
                App.common.module('Add to group', View.get_view('history', 'add_to_group_form', {'key': key}), '');
                e.stopPropagation();
            });
        },

        /**
         * 加入分组
         */
        add_to_group: function() {
            $('body').on('click', '#history-add-to-group', function(e) {
                let target = $('.history-add-to-group-form');
                let group_id = target.find('.history-group-selector').val(),
                    history_key = target.find('.history-key').val(),
                    module_id = $(this).attr('data-module-id');
                if (!group_id || !history_key) {
                    return false;
                }
                App.history.add_to_group(history_key, group_id);
                $('.module-box-' + module_id).remove();
                e.stopPropagation();
            });
        },

        /**
         * 向上/下移动
         */
        move_position: function() {
            $('body').on('click', '.history-move', function(e) {
                let data_type = $(this).attr('data-type'),
                    key = $(this).parent().attr('data-key');
                App.history.move_position(data_type, key);
                e.stopPropagation();
            });
        },

        /**
         * 删除
         */
        delete: function() {
            $('body').on('click', '.history-tips-add-list li.delete', function(e) {
                let key = $(this).parent().attr('data-key');
                if (key) {
                    App.common.dialog().confirm('Confirm to clear the data?', function() {
                        App.history.del(key);
                    });
                }
                e.stopPropagation();
            });
        },

        clear: function() {

        },

        /**
         * 搜索
         */
        search: function() {
            $('#history-search').on('keydown', function(e) {
                if (e.keyCode === 13) {
                    App.history.search($(this), e);
                    $('.history-host').find('li').removeClass('focus');
                }
            });
        },

        /**
         * 分组tab切换
         */
        group_tab: function() {
            $('#history-content').on('click', '.history-group-tab li', function(e) {
                let index = $(this).index(),
                    target_parent = $('#history-content').find('#history-sidebar');

                target_parent.find('.history-group-tab li').removeClass('focus').eq(index).addClass('focus');
                target_parent.find('.history-host').addClass('hide').eq(index).removeClass('hide');
            });
        }
    };
});
